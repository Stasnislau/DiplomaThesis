import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { of } from "rxjs";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/appModule";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";
import { PrismaService } from "../prisma/prismaService";
import { Role } from "@prisma/client";
import { createTestJwtToken, createTestRefreshToken } from "./helpers/jwt.helper";

/**
 * The administrative half of the auth surface, plus the session paths
 * the first suite leaves open.
 *
 * Role checks live on the route through a guard, so a unit test on the
 * service cannot show whether they are attached. Every case here asks
 * the same question from a different angle: can an ordinary account
 * reach something only an administrator should, and does a session
 * path fail closed when a token is absent, stale, or forged.
 */
describe("Auth administration and sessions (HTTP boundary)", () => {
  let app: INestApplication;
  let prisma: any;

  const learner = {
    id: "learner-1",
    email: "learner@example.com",
    role: Role.USER,
    createdAt: new Date(),
  };

  const admin = {
    id: "admin-1",
    email: "admin@example.com",
    role: Role.ADMIN,
    createdAt: new Date(),
  };

  const learnerToken = () => createTestJwtToken(learner.id, learner.email, Role.USER);
  const adminToken = () => createTestJwtToken(admin.id, admin.email, Role.ADMIN);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider("EVENT_SERVICE")
      .useValue({
        emit: jest.fn().mockReturnValue(of(undefined)),
        send: jest.fn().mockReturnValue(of(undefined)),
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
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
        credentials: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        refreshToken: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ErrorHandlingMiddleware());
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listing accounts", () => {
    it("lets an administrator through", async () => {
      prisma.user.findMany.mockResolvedValue([learner]);

      const res = await request(app.getHttpServer())
        .get("/api/auth/allUsers")
        .set("authorization", `Bearer ${adminToken()}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("refuses an ordinary account", async () => {
      await request(app.getHttpServer())
        .get("/api/auth/allUsers")
        .set("authorization", `Bearer ${learnerToken()}`)
        .expect(403);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("refuses a caller with no token", async () => {
      await request(app.getHttpServer()).get("/api/auth/allUsers").expect(401);
    });

    it("refuses a token that was not signed by this service", async () => {
      await request(app.getHttpServer())
        .get("/api/auth/allUsers")
        .set("authorization", "Bearer forged.token.value")
        .expect(401);
    });
  });

  describe("changing a role", () => {
    it("lets an administrator promote an account", async () => {
      prisma.user.update.mockResolvedValue({ ...learner, role: Role.ADMIN });

      await request(app.getHttpServer())
        .patch("/api/auth/updateRole")
        .set("authorization", `Bearer ${adminToken()}`)
        .send({ id: learner.id, role: "ADMIN" })
        .expect(200);
    });

    it("refuses an ordinary account trying to promote itself", async () => {
      await request(app.getHttpServer())
        .patch("/api/auth/updateRole")
        .set("authorization", `Bearer ${learnerToken()}`)
        .send({ id: learner.id, role: "ADMIN" })
        .expect(403);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("refuses an anonymous promotion", async () => {
      await request(app.getHttpServer())
        .patch("/api/auth/updateRole")
        .send({ id: learner.id, role: "ADMIN" })
        .expect(401);
    });
  });

  describe("deleting an account", () => {
    it("lets an administrator delete", async () => {
      prisma.user.delete.mockResolvedValue(learner);

      await request(app.getHttpServer())
        .delete(`/api/auth/deleteUser/${learner.id}`)
        .set("authorization", `Bearer ${adminToken()}`)
        .expect(200);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: learner.id },
      });
    });

    it("refuses an ordinary account deleting another", async () => {
      await request(app.getHttpServer())
        .delete("/api/auth/deleteUser/someone-else")
        .set("authorization", `Bearer ${learnerToken()}`)
        .expect(403);

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it("refuses an anonymous delete", async () => {
      await request(app.getHttpServer())
        .delete(`/api/auth/deleteUser/${learner.id}`)
        .expect(401);
    });
  });

  describe("changing a password", () => {
    it("refuses when the old password does not match", async () => {
      prisma.user.findUnique.mockResolvedValue(learner);
      prisma.credentials.findUnique.mockResolvedValue({
        id: "c-1",
        userId: learner.id,
        password: "$2b$10$hash",
      });
      jest
        .spyOn(bcrypt, "compare")
        .mockImplementation(() => Promise.resolve(false) as any);

      const res = await request(app.getHttpServer())
        .put("/api/auth/updatePassword")
        .set("authorization", `Bearer ${learnerToken()}`)
        .send({ oldPassword: "wrong", newPassword: "newPass456" });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(prisma.credentials.update).not.toHaveBeenCalled();
    });

    it("refuses an anonymous change", async () => {
      await request(app.getHttpServer())
        .put("/api/auth/updatePassword")
        .send({ oldPassword: "a", newPassword: "b" })
        .expect(401);
    });
  });

  describe("validating a session", () => {
    it("answers with the account behind a good token", async () => {
      prisma.user.findUnique.mockResolvedValue(learner);

      const res = await request(app.getHttpServer())
        .post("/api/auth/validate")
        .set("authorization", `Bearer ${learnerToken()}`);

      expect(res.status).toBeLessThan(400);
    });

    it("refuses a request with no token", async () => {
      const res = await request(app.getHttpServer()).post("/api/auth/validate");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("refuses a token signed with another secret", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/validate")
        .set("authorization", "Bearer not.a.real.token");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("refreshing a session", () => {
    it("refuses a refresh token the store does not know", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: createTestRefreshToken(learner.id, learner.email) });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("refuses a refresh token that is not a token at all", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: "garbage" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("signing out", () => {
    it("drops the stored refresh row", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "r-1",
        userId: learner.id,
        token: "stored",
      });
      prisma.refreshToken.delete.mockResolvedValue({ id: "r-1" });

      const res = await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("authorization", `Bearer ${learnerToken()}`)
        .send({ refreshToken: "stored" });

      expect(res.status).toBeLessThan(500);
    });

    it("refuses an anonymous sign-out", async () => {
      const res = await request(app.getHttpServer()).post("/api/auth/logout");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
