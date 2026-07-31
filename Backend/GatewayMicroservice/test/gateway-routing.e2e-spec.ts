import * as request from "supertest";

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import helmet from "helmet";

import { AppModule } from "../src/app.module";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";

/**
 * Routing and authentication at the HTTP boundary.
 *
 * The gateway is the only public address of the platform, so the
 * decisions it makes on every request matter more than the code behind
 * them: which service a path belongs to, whether a token is checked
 * before forwarding, and what a caller sees when a service behind it
 * is down. These run against the real service with only the outbound
 * HTTP client replaced.
 */
describe("Gateway routing (HTTP boundary)", () => {
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

  const downstream = {
    data: { success: true, payload: "ok" },
    status: 200,
    headers: {},
  };

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
    http.request.mockReturnValue(of(downstream));
  });

  afterEach(async () => {
    await app.close();
  });

  const targetOf = () => http.request.mock.calls[0][0].url as string;

  describe("choosing a service", () => {
    it("sends an auth path to the auth service", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/auth/auth/login")
        .send({ email: "a@b.c", password: "x" })
        .expect(200);

      expect(targetOf()).toContain("/api/auth/login");
    });

    it("sends a user path to the user service", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(targetOf()).toContain("/api/me");
    });

    it("sends a generation path to the AI service", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/ai/writing/essay")
        .expect(200);

      expect(targetOf()).toContain("/api/writing/essay");
    });

    it("refuses a service name it does not know", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/gateway/billing/invoices")
        .expect(404);

      expect(JSON.stringify(res.body)).toContain("billing");
      expect(http.request).not.toHaveBeenCalled();
    });

    it("refuses a path that names no service at all", async () => {
      await request(app.getHttpServer()).get("/api/gateway/").expect(404);

      expect(http.request).not.toHaveBeenCalled();
    });

    it("carries the method through to the service", async () => {
      await request(app.getHttpServer())
        .delete("/api/gateway/user/ai-tokens/t-1")
        .expect(200);

      expect(http.request.mock.calls[0][0].method).toBe("DELETE");
    });
  });

  describe("authentication before forwarding", () => {
    it("checks the token on a protected path", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .set("authorization", "Bearer token")
        .expect(200);

      expect(http.post).toHaveBeenCalled();
    });

    it("attaches the caller identity for the service behind it", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .set("authorization", "Bearer token")
        .expect(200);

      const headers = http.request.mock.calls[0][0].headers;
      expect(headers["X-User-Id"]).toBe("learner-1");
      expect(headers["X-User-Role"]).toBe("USER");
    });

    it("skips the check on sign-in", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/auth/auth/login")
        .send({ email: "a@b.c", password: "x" })
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("skips the check on the languages list", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/languages")
        .expect(200);

      expect(http.post).not.toHaveBeenCalled();
    });

    it("stops a request whose token the auth service rejects", async () => {
      http.post.mockReturnValue(throwError(() => new Error("Invalid token")));

      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .set("authorization", "Bearer stale");

      expect(res.status).toBe(401);
      expect(http.request).not.toHaveBeenCalled();
    });
  });

  describe("when a service behind the gateway fails", () => {
    it("passes a downstream rejection back with its own status", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "Request failed",
          response: { status: 422, data: { success: false } },
        })),
      );

      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(422);
    });

    it("answers 503 when the service never responds", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "socket hang up",
          request: {},
        })),
      );

      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(503);

      expect(JSON.stringify(res.body)).toContain("unavailable");
    });

    it("keeps the downstream failure text out of the reply", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "connect ECONNREFUSED 10.0.0.4:3004",
          request: {},
        })),
      );

      const res = await request(app.getHttpServer()).get(
        "/api/gateway/user/me",
      );

      expect(JSON.stringify(res.body)).not.toContain("10.0.0.4");
    });
  });
});
