import { NextFunction, Request, Response } from "express";
import { of, throwError } from "rxjs";

import { HttpService } from "@nestjs/axios";
import { ProxyMiddleware } from "./proxy.middleware";

// Мокаем константы
jest.mock("src/consts", () => ({
  AUTH_MICROSERVICE_URL: "http://auth:3001",
}));

describe("ProxyMiddleware", () => {
  let middleware: ProxyMiddleware;
  let httpService: jest.Mocked<HttpService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    httpService = {
      request: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    middleware = new ProxyMiddleware(httpService);

    mockRequest = {
      method: "GET",
      url: "/api/auth/validate",
      headers: { authorization: "Bearer xxx" },
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("use", () => {
    // ✅ ГОТОВЫЙ ТЕСТ
    it("should proxy request to auth microservice", async () => {
      const mockAxiosResponse = {
        status: 200,
        data: { success: true },
        headers: {},
      };
      (httpService.request as jest.Mock).mockReturnValue(of(mockAxiosResponse));

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://auth:3001/api/auth/validate",
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({ success: true });
    });

    // ==========================================
    // 🔴 ТВОЯ ОЧЕРЕДЬ - ДОПИШИ ЭТИ ТЕСТЫ:
    // ==========================================

    it("should forward response headers", async () => {
      // TODO: Напиши тест
      // 1. Мокни response с headers: { "x-custom-header": "value" }
      // 2. Проверь что mockResponse.setHeader был вызван
    });

    it("should return 500 on error", async () => {
      // TODO: Напиши тест
      // 1. Мокни httpService.request чтобы выбросил ошибку:
      //    throwError(() => new Error("Connection refused"))
      // 2. Проверь что mockResponse.status(500) был вызван
      // 3. Проверь что mockResponse.json был вызван с { success: false }
    });

    it("should forward request body", async () => {
      // TODO: Напиши тест
      // 1. Установи mockRequest.body = { email: "test@test.com" }
      // 2. Проверь что httpService.request был вызван с data: { email: "..." }
    });

    it("should forward request method", async () => {
      // TODO: Напиши тест
      // 1. Установи mockRequest.method = "POST"
      // 2. Проверь что httpService.request был вызван с method: "POST"
    });
  });
});
