import * as request from "supertest";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/appModule";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";
import { PrismaService } from "../prisma/prismaService";
import { encryptSecret } from "../src/utils/secretCipher";

/**
 * HTTP-boundary tests for the resources a learner owns: uploaded
 * materials, achievements, placement results, and provider keys.
 *
 * Each of these lives behind either the forwarded identity or the
 * shared service key, and both gates sit in the request pipeline
 * rather than in the services. A unit test calling a service method
 * directly cannot tell whether the gate is wired to the route at all,
 * which is what these cases establish.
 */
describe("User resources (HTTP boundary)", () => {
  let app: INestApplication;
  let prisma: any;

  const INTERNAL_KEY = "test-internal-key";

  const learner = { id: "learner-1", email: "learner@example.com", role: "USER" };
  const admin = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

  const asUser = (u: typeof learner) => ({
    "x-user-id": u.id,
    "x-user-email": u.email,
    "x-user-role": u.role,
  });

  beforeAll(async () => {
    process.env.INTERNAL_SERVICE_KEY = INTERNAL_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        userMaterial: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        achievement: {
          findMany: jest.fn(),
          count: jest.fn(),
          createMany: jest.fn(),
          upsert: jest.fn().mockResolvedValue({ id: 'a-1' }),
        },
        userAchievement: {
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        userAIToken: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
        },
        aiProvider: { findMany: jest.fn() },
        placementTestResult: { create: jest.fn(), findFirst: jest.fn() },
        userLanguage: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
        $transaction: jest.fn((cb: any) =>
          typeof cb === "function" ? cb({}) : Promise.all(cb),
        ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ErrorHandlingMiddleware());
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api");

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploaded materials", () => {
    it("lists only the material of the calling learner", async () => {
      prisma.userMaterial.findMany.mockResolvedValue([{ id: "m-1" }]);

      await request(app.getHttpServer())
        .get("/api/materials")
        .set(asUser(learner))
        .expect(200);

      expect(prisma.userMaterial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: learner.id }),
        }),
      );
    });

    it("does not read one learner's document for another", async () => {
      prisma.userMaterial.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get("/api/materials/someone-elses-id")
        .set(asUser(learner));

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("refuses a listing with no identity at all", async () => {
      const res = await request(app.getHttpServer()).get("/api/materials");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("achievements", () => {
    it("counts against the calling learner", async () => {
      prisma.userAchievement.count.mockResolvedValue(3);
      prisma.achievement.count.mockResolvedValue(10);

      const res = await request(app.getHttpServer())
        .get("/api/achievements/count")
        .set(asUser(learner));

      expect(res.status).toBe(200);
    });

    it("keeps the seeding route for administrators only", async () => {
      await request(app.getHttpServer())
        .post("/api/achievements/seed")
        .set(asUser(learner))
        .expect(403);
    });

    it("lets an administrator seed", async () => {
      prisma.achievement.findMany.mockResolvedValue([]);
      prisma.achievement.upsert.mockResolvedValue({ id: "a-1" });

      const res = await request(app.getHttpServer())
        .post("/api/achievements/seed")
        .set(asUser(admin));

      expect(res.status).toBeLessThan(400);
    });

    it("refuses progress writes that carry no service key", async () => {
      await request(app.getHttpServer())
        .post("/api/achievements/progress")
        .set(asUser(learner))
        .send({ code: "FIRST_LESSON" })
        .expect(403);
    });

    it("refuses progress writes with a wrong service key", async () => {
      await request(app.getHttpServer())
        .post("/api/achievements/progress")
        .set({ ...asUser(learner), "x-internal-service-key": "guessed" })
        .send({ code: "FIRST_LESSON" })
        .expect(403);
    });
  });

  describe("provider keys", () => {
    it("never returns a stored key in full", async () => {
      prisma.userAIToken.findMany.mockResolvedValue([
        {
          id: "t-1",
          userId: learner.id,
          token: encryptSecret("sk-live-abcdefghijklmnop"),
          isDefault: true,
          aiProvider: { id: "openai", name: "OpenAI" },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/ai-tokens")
        .set(asUser(learner))
        .expect(200);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain("abcdefghijklmnop");
      expect(body).toContain("...");
    });

    it("asks only for the calling learner's keys", async () => {
      prisma.userAIToken.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/api/ai-tokens")
        .set(asUser(learner))
        .expect(200);

      expect(prisma.userAIToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: learner.id }),
        }),
      );
    });

    it("refuses to delete a key that belongs to another learner", async () => {
      prisma.userAIToken.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete("/api/ai-tokens/someone-elses-key")
        .set(asUser(learner));

      expect(prisma.userAIToken.delete).not.toHaveBeenCalled();
      expect(res.status).toBeLessThan(500);
    });
  });

  describe("placement result", () => {
    it("refuses a completion that carries no identity", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/placement-test/complete")
        .send({ languageId: "en", level: "B2", score: 71 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("keeps the route behind the api prefix", async () => {
      await request(app.getHttpServer())
        .post("/placement-test/complete")
        .set(asUser(learner))
        .expect(404);
    });
  });
});
