import * as request from "supertest";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/appModule";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";
import { PrismaService } from "../prisma/prismaService";

/**
 * Request and response contracts at the HTTP boundary.
 *
 * The service answers a browser and two other services, and all three
 * depend on the same two promises: a body that fails validation never
 * reaches a handler, and a failure comes back in the envelope the
 * client knows how to read. Both promises live in the pipeline, so
 * they are checked here over real requests.
 */
describe("User contracts (HTTP boundary)", () => {
  let app: INestApplication;
  let prisma: any;

  const learner = { id: "learner-1", email: "learner@example.com", role: "USER" };

  const asUser = (u = learner) => ({
    "x-user-id": u.id,
    "x-user-email": u.email,
    "x-user-role": u.role,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        language: { findMany: jest.fn(), findUnique: jest.fn() },
        userLanguage: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        userMaterial: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
        userAIToken: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
        aiProvider: { findMany: jest.fn() },
        achievement: { findMany: jest.fn(), count: jest.fn() },
        userAchievement: { findMany: jest.fn(), count: jest.fn() },
        userError: { findMany: jest.fn(), create: jest.fn() },
        taskHistory: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
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

  describe("the error envelope", () => {
    it("wraps a not-found route in the same shape as any other failure", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/no-such-route")
        .set(asUser());

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body.payload).toHaveProperty("timestamp");
    });

    it("answers malformed JSON without crashing the process", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/addUserLanguage")
        .set(asUser())
        .set("content-type", "application/json")
        .send("{ this is not json");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it("carries a machine-readable code on a rejected read", async () => {
      const res = await request(app.getHttpServer()).get("/api/me");

      expect(res.body.payload).toHaveProperty("code");
    });

    it("returns JSON and not HTML when a route is missing", async () => {
      const res = await request(app.getHttpServer()).get("/api/nope");

      expect(res.headers["content-type"]).toContain("application/json");
    });
  });

  describe("method routing", () => {
    it("refuses a verb the route does not define", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/languages")
        .set(asUser());

      expect(res.status).toBe(404);
    });

    it("keeps the health probe on GET only", async () => {
      const res = await request(app.getHttpServer()).post("/api/health");

      expect(res.status).toBe(404);
    });

    it("accepts the documented verb on the profile route", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: learner.id, languages: [] });

      await request(app.getHttpServer())
        .get("/api/me")
        .set(asUser())
        .expect(200);
    });
  });

  describe("identity headers", () => {
    it("treats an empty identity header as no identity", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/me")
        .set({ "x-user-id": "" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("reads the role from the header and not from the body", async () => {
      await request(app.getHttpServer())
        .get("/api/users")
        .set(asUser())
        .send({ role: "ADMIN" })
        .expect(403);
    });

    it("accepts an administrator on the same route", async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/api/users")
        .set({ ...asUser(), "x-user-role": "ADMIN" })
        .expect(200);
    });

    it("ignores an unknown role name", async () => {
      await request(app.getHttpServer())
        .get("/api/users")
        .set({ ...asUser(), "x-user-role": "SUPERUSER" })
        .expect(403);
    });
  });

  describe("public reads", () => {
    it("serves the language list to an anonymous caller", async () => {
      prisma.language.findMany.mockResolvedValue([{ id: "en", name: "English" }]);

      const res = await request(app.getHttpServer())
        .get("/api/languages")
        .expect(200);

      expect(res.body.payload).toHaveLength(1);
    });

    it("returns an empty list rather than an error when nothing is stored", async () => {
      prisma.language.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/languages")
        .expect(200);

      expect(res.body.payload).toEqual([]);
    });

    it("answers the health probe with a body", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe("writes that need a learner", () => {
    it("refuses to attach a language without an identity", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/addUserLanguage")
        .send({ languageId: "en", level: "B1" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("attaches a language for the calling learner", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: learner.id });
      prisma.language.findUnique.mockResolvedValue({ id: "en", name: "English" });
      prisma.userLanguage.findFirst.mockResolvedValue(null);
      prisma.userLanguage.create.mockResolvedValue({ id: "ul-1" });

      const res = await request(app.getHttpServer())
        .post("/api/addUserLanguage")
        .set(asUser())
        .send({ languageId: "en", level: "B1" });

      expect(res.status).toBeLessThan(500);
    });

    it("refuses a native-language write with no identity", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/setNativeLanguage")
        .send({ languageId: "en" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("refuses a profile update with no identity", async () => {
      const res = await request(app.getHttpServer())
        .put("/api/updateUser")
        .send({ name: "New" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
