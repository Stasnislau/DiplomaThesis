import * as request from "supertest";

import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import helmet from "helmet";

import { AppModule } from "../src/app.module";
import { ErrorHandlingMiddleware } from "../src/middlewares/errorHandlingMiddleware";
import { GatewayService } from "../src/services/gatewayService";

/**
 * HTTP-boundary tests for the gateway.
 *
 * The unit spec covers routing decisions inside GatewayService with
 * the HTTP layer bypassed. Three guarantees only exist once a real
 * request enters the Nest pipeline: the global request limit that
 * NFR5 fixes at sixty per minute, the security headers, and the
 * global prefix. Nothing verified those until this suite, so a
 * change to the throttler configuration could have passed CI
 * unnoticed.
 */
describe("Gateway (HTTP boundary)", () => {
  let app: INestApplication;
  let handleRequest: jest.Mock;

  const buildApp = async () => {
    handleRequest = jest.fn().mockResolvedValue({
      status: 200,
      data: { success: true, payload: "downstream" },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GatewayService)
      .useValue({ handleRequest })
      .compile();

    const created = moduleFixture.createNestApplication();
    // Mirror main.ts so the pipeline matches production.
    created.use(helmet());
    created.useGlobalFilters(new ErrorHandlingMiddleware());
    created.setGlobalPrefix("api");
    await created.init();
    return created;
  };

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("forwarding", () => {
    it("hands the method, the path, and the body to the routing layer", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/gateway/auth/login")
        .send({ email: "learner@example.com" })
        .expect(200);

      expect(res.body.payload).toBe("downstream");
      expect(handleRequest).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining("/api/gateway/auth/login"),
        expect.any(Object),
        expect.objectContaining({ email: "learner@example.com" }),
        expect.anything(),
      );
    });

    it("returns the status the downstream service chose", async () => {
      handleRequest.mockResolvedValue({
        status: 404,
        data: { success: false, payload: { message: "no such account" } },
      });

      await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(404);
    });

    it("passes a refresh cookie back to the browser untouched", async () => {
      handleRequest.mockResolvedValue({
        status: 200,
        data: { success: true },
        setCookie: ["refreshToken=abc; HttpOnly; Path=/"],
      });

      const res = await request(app.getHttpServer())
        .post("/api/gateway/auth/refresh")
        .expect(200);

      expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
    });

    it("answers with a gateway error instead of a stack trace when routing throws", async () => {
      handleRequest.mockRejectedValue(new Error("upstream socket closed"));

      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).not.toContain("socket closed");
    });
  });

  describe("request limit (NFR5)", () => {
    it("allows sixty requests in a window and refuses the sixty-first", async () => {
      const server = app.getHttpServer();

      for (let i = 0; i < 60; i += 1) {
        await request(server).get("/api/gateway/user/me").expect(200);
      }

      await request(server).get("/api/gateway/user/me").expect(429);
    }, 30000);
  });

  describe("edge protections", () => {
    it("sets the standard security headers on a response", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/gateway/user/me")
        .expect(200);

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBeDefined();
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("serves the health probe", async () => {
      await request(app.getHttpServer()).get("/api/health").expect(200);
    });

    it("exposes nothing outside the api prefix", async () => {
      await request(app.getHttpServer())
        .get("/gateway/user/me")
        .expect(404);

      expect(handleRequest).not.toHaveBeenCalled();
    });
  });
});
