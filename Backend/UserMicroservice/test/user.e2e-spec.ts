import * as request from "supertest";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/appModule";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";
import { PrismaService } from "../prisma/prismaService";

describe("User service (HTTP boundary)", () => {
  let app: INestApplication;
  let prisma: any;

  const learner = {
    id: "learner-1",
    email: "learner@example.com",
    role: "USER",
  };

  const admin = {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
  };

  const asUser = (u: typeof learner) => ({
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
        user: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        language: { findMany: jest.fn() },
        userLanguage: { findFirst: jest.fn(), create: jest.fn() },
        achievement: { findMany: jest.fn() },
        userAchievement: { findMany: jest.fn(), create: jest.fn() },
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

  describe("forwarded identity", () => {
    it("passes the caller id from the gateway header down to the query", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: learner.id,
        email: learner.email,
        languages: [],
      });

      const res = await request(app.getHttpServer())
        .get("/api/me")
        .set(asUser(learner))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: learner.id } }),
      );
    });

    it("never lets one account read another by editing the request body", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: learner.id,
        email: learner.email,
        languages: [],
      });

      await request(app.getHttpServer())
        .get("/api/me")
        .set(asUser(learner))
        .send({ id: admin.id })
        .expect(200);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: learner.id } }),
      );
    });

    it("rejects a call that carries no identity header at all", async () => {
      const res = await request(app.getHttpServer()).get("/api/me");

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("admin listing", () => {
    it("refuses an ordinary account", async () => {
      await request(app.getHttpServer())
        .get("/api/users")
        .set(asUser(learner))
        .expect(403);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("refuses a call with no role claim", async () => {
      await request(app.getHttpServer())
        .get("/api/users")
        .set({ "x-user-id": learner.id })
        .expect(403);
    });

    it("admits an administrator", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: learner.id, email: learner.email },
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/users")
        .set(asUser(admin))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe("routing and probes", () => {
    it("serves the health probe without any identity headers", async () => {
      await request(app.getHttpServer()).get("/api/health").expect(200);
    });

    it("answers the languages list without an account", async () => {
      prisma.language.findMany.mockResolvedValue([
        { id: "en", name: "English" },
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/languages")
        .expect(200);

      expect(res.body.payload).toHaveLength(1);
    });

    it("exposes nothing outside the api prefix", async () => {
      await request(app.getHttpServer()).get("/me").expect(404);
    });
  });

  describe("failures leave with a stable shape", () => {
    it("turns a database error into a JSON error body, not a stack trace", async () => {
      prisma.user.findUnique.mockRejectedValue(new Error("connection lost"));

      const res = await request(app.getHttpServer())
        .get("/api/me")
        .set(asUser(learner));

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.stringify(res.body)).not.toContain("connection lost");
    });
  });
});
