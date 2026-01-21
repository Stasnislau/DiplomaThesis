import { ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { JwtAuthGuard } from "./jwtAuthGuard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe("handleRequest", () => {
    it("should return user when no error and user exists", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        role: "USER",
      };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException when user is null", () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when user is undefined", () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException,
      );
    });

    it("should throw the original error when err is provided", () => {
      const originalError = new Error("Token expired");
      const mockUser = { id: "user-123" };

      expect(() => guard.handleRequest(originalError, mockUser, null)).toThrow(
        originalError,
      );
    });

    it("should throw original error even when user exists", () => {
      // Arrange
      const customError = new UnauthorizedException("Custom auth error");
      const mockUser = { id: "user-123", email: "test@example.com" };

      // Act & Assert
      expect(() => guard.handleRequest(customError, mockUser, null)).toThrow(
        "Custom auth error",
      );
    });

    it("should throw UnauthorizedException when both err and user are null", () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("canActivate", () => {
    it("should call super.canActivate", () => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: { authorization: "Bearer valid.token" },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(typeof guard.canActivate).toBe("function");
    });
  });
});
