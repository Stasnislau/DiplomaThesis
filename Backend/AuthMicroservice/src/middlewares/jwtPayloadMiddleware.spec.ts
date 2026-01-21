import { NextFunction, Request, Response } from "express";

import { JwtPayloadMiddleware } from "./jwtPayloadMiddleware";
import { JwtService } from "@nestjs/jwt";

describe("JwtPayloadMiddleware", () => {
  let middleware: JwtPayloadMiddleware;
  let jwtService: jest.Mocked<JwtService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    middleware = new JwtPayloadMiddleware(jwtService);

    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("use", () => {
    it("should extract user from valid JWT and attach to request", () => {
      mockRequest.headers = {
        authorization: "Bearer valid.jwt.token",
      };

      jwtService.verify.mockReturnValue({
        sub: "user-123",
        email: "test@test.com",
        role: "USER",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest["user"]).toEqual({
        id: "user-123",
        email: "test@test.com",
        role: "USER",
      });
      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verify).toHaveBeenCalledWith(
        "valid.jwt.token",
        expect.objectContaining({ secret: expect.any(String) }),
      );
    });

    it("should call next() when no Authorization header", () => {
      mockRequest.headers = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest["user"]).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("should call next() when Authorization header does not start with Bearer", () => {
      mockRequest.headers = {
        authorization: "Basic sometoken",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest["user"]).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("should throw when jwtService.verify throws (invalid token)", () => {
      mockRequest.headers = {
        authorization: "Bearer invalid.token",
      };

      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid signature");
      });

      expect(() => {
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow();

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should throw when jwtService.verify throws TokenExpiredError", () => {
      mockRequest.headers = {
        authorization: "Bearer expired.token",
      };

      const tokenExpiredError = new Error("jwt expired");
      tokenExpiredError.name = "TokenExpiredError";
      jwtService.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });

      expect(() => {
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow(tokenExpiredError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should correctly map payload.sub to user.id", () => {
      mockRequest.headers = {
        authorization: "Bearer token.with.sub",
      };

      jwtService.verify.mockReturnValue({
        sub: "unique-user-id-456",
        email: "unique@email.com",
        role: "ADMIN",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest["user"]).toMatchObject({
        id: "unique-user-id-456",
      });
    });

    it("should handle empty token after Bearer", () => {
      mockRequest.headers = {
        authorization: "Bearer ",
      };

      jwtService.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      expect(() => {
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow();
    });
  });
});
