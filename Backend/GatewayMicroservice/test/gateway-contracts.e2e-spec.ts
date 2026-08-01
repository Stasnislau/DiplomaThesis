import * as request from "supertest";

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import helmet from "helmet";

import { AppModule } from "../src/app.module";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";

describe("Gateway contracts (HTTP boundary)", () => {
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

  const sent = () => http.request.mock.calls[0][0];

  describe("carrying the request", () => {
    it("passes a JSON body through unchanged", async () => {
      const body = { email: "a@b.c", nested: { level: "B2", scores: [1, 2] } };

      await request(app.getHttpServer())
        .post("/api/gateway/user/placement-test/complete")
        .send(body)
        .expect(200);

      expect(sent().data).toMatchObject(body);
    });

    it("keeps a query string on the forwarded path", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/history?type=writing&limit=5")
        .expect(200);

      expect(sent().url).toContain("type=writing");
    });

    it("forwards the content type the caller chose", async () => {
      await request(app.getHttpServer())
        .post("/api/gateway/user/me/activity")
        .set("content-type", "application/json")
        .send({ xpGained: 10 })
        .expect(200);

      expect(String(sent().headers["content-type"])).toContain("json");
    });

    it("forwards a PUT with its body", async () => {
      await request(app.getHttpServer())
        .put("/api/gateway/user/updateUser")
        .send({ name: "New" })
        .expect(200);

      expect(sent().method).toBe("PUT");
      expect(sent().data).toMatchObject({ name: "New" });
    });

    it("forwards a PATCH with its body", async () => {
      await request(app.getHttpServer())
        .patch("/api/gateway/user/ai-tokens/t-1/default")
        .send({})
        .expect(200);

      expect(sent().method).toBe("PATCH");
    });

    it("reaches a nested path with several segments", async () => {
      await request(app.getHttpServer())
        .get("/api/gateway/user/ai-tokens/t-1/default")
        .expect(200);

      expect(sent().url).toContain("/api/ai-tokens/t-1/default");
    });
  });

  describe("what comes back", () => {
    it("returns the payload the service produced", async () => {
      http.request.mockReturnValue(
        of({ data: { success: true, payload: { level: "B2" } }, status: 200, headers: {} }),
      );

      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(res.body.payload).toEqual({ level: "B2" });
    });

    it("keeps a 201 from the service as a 201", async () => {
      http.request.mockReturnValue(
        of({ data: { success: true }, status: 201, headers: {} }),
      );

      await request(app.getHttpServer())
        .post("/api/gateway/user/addUserLanguage")
        .send({ languageId: "en" })
        .expect(201);
    });

    it("passes a validation failure back with its own status", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "Request failed",
          response: { status: 400, data: { success: false, payload: { code: "X" } } },
        })),
      );

      const res = await request(app.getHttpServer())
        .post("/api/gateway/user/addUserLanguage")
        .send({})
        .expect(400);

      expect(res.body.payload.code).toBe("X");
    });

    it("never reports success when the service refused", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "Request failed",
          response: { status: 403, data: { success: false } },
        })),
      );

      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/users")
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("what never leaves", () => {
    it("does not advertise the server technology", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("does not echo the internal target address on failure", async () => {
      http.request.mockReturnValue(
        throwError(() => ({
          isAxiosError: true,
          message: "connect ECONNREFUSED user-service:3004",
          request: {},
        })),
      );

      const res = await request(app.getHttpServer()).get(
        "/api/gateway/user/me",
      );

      expect(JSON.stringify(res.body)).not.toContain("user-service:3004");
    });

    it("does not forward the caller's authorization header value into the reply", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .set("authorization", "Bearer secret-token-value")
        .expect(200);

      expect(JSON.stringify(res.body)).not.toContain("secret-token-value");
    });

    it("sets a content type on every reply", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(res.headers["content-type"]).toContain("application/json");
    });
  });
});
