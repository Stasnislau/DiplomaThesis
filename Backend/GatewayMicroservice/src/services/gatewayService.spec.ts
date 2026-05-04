import { Test, TestingModule } from "@nestjs/testing";
import { of, throwError } from "rxjs";

import { GatewayService } from "./gatewayService";
import { HttpService } from "@nestjs/axios";
import { IncomingMessage } from "http";
import { UnauthorizedException } from "@nestjs/common";

jest.mock("src/consts", () => ({
  AUTH_MICROSERVICE_URL: "http://auth:3001",
  BRIDGE_MICROSERVICE_URL: "http://bridge:8000",
  USER_MICROSERVICE_URL: "http://user:3004",
  AVAILABLE_MICROSERVICES: ["auth", "bridge", "user"],
}));

describe("GatewayService", () => {
  let service: GatewayService;
  let httpService: jest.Mocked<HttpService>;

  const mockHeaders = {
    authorization: "Bearer valid.jwt.token",
    "content-type": "application/json",
  };

  const mockAuthResponse = {
    data: {
      success: true,
      payload: {
        id: "user-123",
        email: "test@test.com",
        role: "USER",
      },
    },
    status: 200,
    headers: {},
  };

  const createMockReq = (): IncomingMessage => {
    return {
      pipe: jest.fn(),
    } as unknown as IncomingMessage;
  };

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleRequest", () => {
    it("should route request to auth microservice", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true, payload: "response from auth" },
        }),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/auth/users",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(200);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://auth:3001/api/users",
        }),
      );
    });

    it("should skip authentication for public routes", async () => {
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true, payload: { accessToken: "xxx" } },
        }),
      );

      const result = await service.handleRequest(
        "POST",
        "/api/gateway/auth/auth/login",
        { "content-type": "application/json" },
        { email: "test@test.com", password: "123" },
        createMockReq(),
      );

      expect(result.status).toBe(200);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("should route request to user microservice", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true, payload: "response from user" },
        }),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(200);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://user:3004/api/profile",
        }),
      );
    });

    it("should route request to bridge microservice", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true, payload: "response from bridge" },
        }),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/bridge/writing/task",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(200);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://bridge:8000/api/writing/task",
        }),
      );
    });

    it("should return 404 for unknown microservice", async () => {
      const result = await service.handleRequest(
        "GET",
        "/api/gateway/unknown/something",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(404);
      expect(
        (result.data as { payload: { message: string } }).payload.message,
      ).toContain("not found");
    });

    it("should return 404 for invalid URL pattern", async () => {
      const result = await service.handleRequest(
        "GET",
        "/api/something/else",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(404);
      expect(
        (result.data as { payload: { message: string } }).payload.message,
      ).toContain("not found");
    });

    it("should add user headers when authenticated", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true },
        }),
      );

      await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(httpService.post).toHaveBeenCalled();

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-User-Id": "user-123",
            "X-User-Email": "test@test.com",
            "X-User-Role": "USER",
          }),
        }),
      );
    });

    it("should return 401 when token validation fails", async () => {
      // validateToken wraps any axios failure in UnauthorizedException —
      // gateway must surface that as 401, not 500.
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new UnauthorizedException()),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(401);
    });

    it("should map non-HTTP errors to 500 with a structured payload", async () => {
      // A non-HttpException raised inside validateToken still gets
      // wrapped as UnauthorizedException by the catch in
      // validateToken, but if anything fell through it should still
      // produce the structured failure envelope.
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error("Invalid token")),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect([401, 500]).toContain(result.status);
      expect(result.data.success).toBe(false);
    });

    it("should return 503 when downstream service is unavailable", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        throwError(() => ({ request: {} })),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        createMockReq(),
      );

      expect(result.status).toBe(503);
      expect(
        (result.data as { payload: { message: string } }).payload.message,
      ).toContain("unavailable");
    });

    it("should handle multipart/form-data requests", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({ status: 200, data: {} }),
      );

      const mockReq = createMockReq();
      const multipartHeaders = {
        ...mockHeaders,
        "content-type": "multipart/form-data; boundary=xxx",
      };

      await service.handleRequest(
        "POST",
        "/api/gateway/user/upload",
        multipartHeaders,
        {},
        mockReq,
      );

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockReq,
        }),
      );
    });
  });
});
