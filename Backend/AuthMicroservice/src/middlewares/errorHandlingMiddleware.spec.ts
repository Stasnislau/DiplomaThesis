import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { ErrorHandlingMiddleware } from "./errorHandlingMiddleware";
import { Response } from "express";

describe("ErrorHandlingMiddleware", () => {
  let middleware: ErrorHandlingMiddleware;
  let mockResponse: jest.Mocked<Partial<Response>>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    middleware = new ErrorHandlingMiddleware();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("catch", () => {
    it("should handle TokenExpiredError with 401 status", () => {
      const exception = new TokenExpiredError("Token has expired", new Date());

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Token has expired",
          }),
        }),
      );
    });

    it("should handle JsonWebTokenError with 401 status", () => {
      const exception = new JsonWebTokenError("invalid signature");

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Invalid token",
          }),
        }),
      );
    });

    it("should handle generic HttpException with its status", () => {
      const exception = new HttpException("Forbidden resource", 403);

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle UnauthorizedException with 401 status", () => {
      const exception = new UnauthorizedException("Not authorized");

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle BadRequestException with validation errors", () => {
      const exception = new BadRequestException({
        message: ["email must be valid", "password is required"],
      });

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            errors: expect.any(Object),
          }),
        }),
      );
    });

    it("should handle unknown errors as 500 InternalServerError", () => {
      const exception = new Error("Something unexpected happened");

      middleware.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          payload: expect.objectContaining({
            message: "Something unexpected happened",
          }),
        }),
      );
    });

    it("should include timestamp in response payload", () => {
      const exception = new UnauthorizedException("Test");

      middleware.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        }),
      );
    });
  });
});
