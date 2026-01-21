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
      // TODO: Напиши тест
      // 1. Мокни httpService.post для validateToken
      // 2. Мокни httpService.request для проксирования
      // 3. Вызови handleRequest с URL "/api/gateway/user/profile"
      // 4. Проверь что targetUrl содержит USER_MICROSERVICE_URL
    });

    it("should route request to bridge microservice", async () => {
      // TODO: Напиши тест для bridge
      // URL: "/api/gateway/bridge/writing/task"
    });

    it("should return 404 for unknown microservice", async () => {
      // TODO: Напиши тест
      // 1. Вызови handleRequest с URL "/api/gateway/unknown/something"
      // 2. Проверь что result.status === 404
      // 3. Проверь что result.data.payload.message содержит "not found"
    });

    it("should return 404 for invalid URL pattern", async () => {
      // TODO: Напиши тест
      // URL без паттерна /api/gateway/...
      // Например: "/api/something/else"
    });

    it("should add user headers when authenticated", async () => {
      // TODO: Напиши тест
      // 1. Мокни успешную аутентификацию
      // 2. Проверь что httpService.request вызывается с headers:
      //    - "X-User-Id"
      //    - "X-User-Email"
      //    - "X-User-Role"
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      // TODO: Напиши тест
      // 1. Мокни httpService.post чтобы выбросил ошибку
      // 2. Вызови handleRequest с невалидным токеном
      // 3. Проверь что возвращается status 500 (или ловит ошибку)
    });

    it("should return 503 when downstream service is unavailable", async () => {
      // TODO: Напиши тест
      // 1. Мокни httpService.request чтобы выбросил ошибку без response
      // 2. Проверь что возвращается status 503
    });

    it("should handle multipart/form-data requests", async () => {
      // TODO: Напиши тест
      // Headers: { "content-type": "multipart/form-data; boundary=xxx" }
      // Проверь что req передаётся напрямую, а не body
    });
  });
});
