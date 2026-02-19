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

    it("should forward response headers", async () => {
      const mockAxiosResponse = {
        status: 200,
        data: { success: true },
        headers: {
          "x-custom-header": "custom-value",
          "content-type": "application/json",
        },
      };
      (httpService.request as jest.Mock).mockReturnValue(of(mockAxiosResponse));

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "x-custom-header",
        "custom-value",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "content-type",
        "application/json",
      );
    });

    it("should return 500 on error", async () => {
      (httpService.request as jest.Mock).mockReturnValue(
        throwError(() => new Error("Connection refused")),
      );

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should forward request body", async () => {
      mockRequest.body = { email: "test@test.com", password: "secret123" };
      mockRequest.method = "POST";

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
          data: { email: "test@test.com", password: "secret123" },
        }),
      );
    });

    it("should forward request method", async () => {
      mockRequest.method = "POST";

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
          method: "POST",
        }),
      );
    });

    it("should handle DELETE requests", async () => {
      mockRequest.method = "DELETE";
      mockRequest.url = "/api/auth/users/123";

      const mockAxiosResponse = {
        status: 204,
        data: null,
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
          method: "DELETE",
          url: "http://auth:3001/api/auth/users/123",
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it("should forward authorization header", async () => {
      mockRequest.headers = { authorization: "Bearer valid-jwt-token" };

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
          headers: expect.objectContaining({
            authorization: "Bearer valid-jwt-token",
          }),
        }),
      );
    });
  });
});
