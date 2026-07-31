import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
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

  it("maps TokenExpiredError to USER_TOKEN_EXPIRED", () => {
    middleware.catch(
      new TokenExpiredError("expired", new Date()),
      mockHost,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        payload: expect.objectContaining({ code: "USER_TOKEN_EXPIRED" }),
      }),
    );
  });

  it("maps JsonWebTokenError to USER_INVALID_TOKEN", () => {
    middleware.catch(new JsonWebTokenError("bad"), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ code: "USER_INVALID_TOKEN" }),
      }),
    );
  });

  it("forwards HttpException status and structured code", () => {
    middleware.catch(
      new HttpException({ code: "USER_NOT_FOUND", message: "gone" }, 404),
      mockHost,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          code: "USER_NOT_FOUND",
          message: "gone",
        }),
      }),
    );
  });

  it("wraps unknown errors as USER_INTERNAL_ERROR", () => {
    middleware.catch(new Error("boom"), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ code: "USER_INTERNAL_ERROR" }),
      }),
    );
  });

  it("attaches validation error arrays from BadRequestException", () => {
    middleware.catch(
      new BadRequestException({
        message: ["email must be an email", "name required"],
      }),
      mockHost,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          errors: ["email must be an email", "name required"],
        }),
      }),
    );
  });

  it("joins array messages from structured HttpException bodies", () => {
    middleware.catch(
      new UnauthorizedException({
        code: "X",
        message: ["a", "b"],
      }),
      mockHost,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ message: "a; b" }),
      }),
    );
  });
});
