import * as request from "supertest";

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import helmet from "helmet";

import { AppModule } from "../src/app.module";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";

describe("Gateway public surface (HTTP boundary)", () => {
  let app: INestApplication;
  let http: { post: jest.Mock; request: jest.Mock };

  const validUser = {
    data: {
      success: true,
      payload: { id: "learner-1", email: "learner@example.com", role: "USER" },
    },
    status: 200,
    headers: {},
  };

  const ok = { data: { success: true, payload: "ok" }, status: 200, headers: {} };

  beforeEach(async () => {
    http = { post: jest.fn(), request: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(http)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.useGlobalFilters(new ErrorHandlingMiddleware());
    app.setGlobalPrefix("api");
    await app.init();

    http.post.mockReturnValue(of(validUser));
    http.request.mockReturnValue(of(ok));
  });

  afterEach(async () => {
    await app.close();
  });

  describe("open without a session", () => {
    it("lets registration through", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/auth/auth/register")
        .send({ email: "a@b.c", password: "x", name: "A", surname: "B" })
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("lets a refresh through", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/auth/auth/refresh")
        .send({ refreshToken: "r" })
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("lets password recovery through from a logged-out browser", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/auth/auth/resetPassword")
        .send({ email: "a@b.c" })
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("lets the auth health probe through", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/auth/health")
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("lets the user health probe through", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/health")
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe("closed without a session", () => {
    it("checks the token before the profile", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("checks the token before the history", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/history")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("checks the token before an account listing", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/users")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("checks the token before a generation call", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/ai/writing/essay")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("checks the token before reading stored provider keys", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/ai-tokens")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("stops a protected call when the session check itself fails", async () => {
      http.post.mockReturnValue(throwError(() => new Error("Invalid token")));

      await request(app.getHttpServer())
        .get("/api/gateway/user/history")
        .expect(401);

      expect(http.request).not.toHaveBeenCalled();
    });
  });

  describe("the gateway's own probe", () => {
    it("answers without reaching any service", async () => {
      await request(app.getHttpServer()).get("/api/health").expect(200);

      expect(http.request).not.toHaveBeenCalled();
      expect(http.post).not.toHaveBeenCalled();
    });

    it("answers with a body", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it("stays outside the gateway prefix", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/health")
        .expect(404);
    });
  });
});
