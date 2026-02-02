import { Test, TestingModule } from "@nestjs/testing";
import { of, throwError } from "rxjs";

import { GatewayService } from "./gatewayService";
import { HttpService } from "@nestjs/axios";
import { UnauthorizedException } from "@nestjs/common";

// Мокаем константы
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

  // ==================== handleRequest ====================
  describe("handleRequest", () => {
    // ✅ ГОТОВЫЙ ТЕСТ - route to auth microservice
    it("should route request to auth microservice", async () => {
      // Mock auth validation
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));

      // Mock actual request forwarding
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
        {},
      );

      expect(result.status).toBe(200);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://auth:3001/api/users",
        }),
      );
    });

    // ✅ ГОТОВЫЙ ТЕСТ - public routes skip auth
    it("should skip authentication for public routes", async () => {
      (httpService.request as jest.Mock).mockReturnValue(
        of({
          status: 200,
          data: { success: true, payload: { accessToken: "xxx" } },
        }),
      );

      // URL translates to http://auth:3001/api/auth/login which matches PUBLIC_ROUTES
      const result = await service.handleRequest(
        "POST",
        "/api/gateway/auth/auth/login",
        { "content-type": "application/json" },
        { email: "test@test.com", password: "123" },
        {},
      );

      expect(result.status).toBe(200);
      // validate token should NOT be called for login
      expect(httpService.post).not.toHaveBeenCalled();
    });

    // ==========================================
    // 🔴 ТВОЯ ОЧЕРЕДЬ - ДОПИШИ ЭТИ ТЕСТЫ:
    // ==========================================

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
        {},
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
        {},
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
        {},
      );

      expect(result.status).toBe(404);
      expect(result.data.payload.message).toContain("not found");
    });

    it("should return 404 for invalid URL pattern", async () => {
      const result = await service.handleRequest(
        "GET",
        "/api/something/else",
        mockHeaders,
        {},
        {},
      );

      expect(result.status).toBe(404);
      expect(result.data.payload.message).toContain("not found");
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
        {},
      );

      // Verify validation call
      expect(httpService.post).toHaveBeenCalled();

      // Verify request forwarding
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

    it("should return error response when unauthorized", async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new UnauthorizedException()),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        {},
      );

      // handleRequest catches the error and returns 500
      expect(result.status).toBe(500);
    });

    // Correction: handleRequest catches all errors and returns 500 structure.
    it("should return 500 structure when token validation fails", async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error("Invalid token")),
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        {},
      );

      expect(result.status).toBe(500);
      expect(result.data.success).toBe(false);
    });

    it("should return 503 when downstream service is unavailable", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        throwError(() => ({ request: {} })), // Error with request but no response = network error
      );

      const result = await service.handleRequest(
        "GET",
        "/api/gateway/user/profile",
        mockHeaders,
        {},
        {},
      );

      expect(result.status).toBe(503);
      expect(result.data.payload.message).toContain("unavailable");
    });

    it("should handle multipart/form-data requests", async () => {
      (httpService.post as jest.Mock).mockReturnValue(of(mockAuthResponse));
      (httpService.request as jest.Mock).mockReturnValue(
        of({ status: 200, data: {} }),
      );

      const mockReq = { pipe: jest.fn() }; // simulate stream
      const multipartHeaders = {
        ...mockHeaders,
        "content-type": "multipart/form-data; boundary=xxx",
      };

      await service.handleRequest(
        "POST",
        "/api/gateway/user/upload",
        multipartHeaders,
        {}, // body is ignored for multipart
        mockReq,
      );

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockReq, // Should pass req object directly
        }),
      );
    });
  });
});
