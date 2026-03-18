import { Role, User } from "@prisma/client";

import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./rolesGuard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (user: User | null = null): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    it("should return true when no roles are defined on handler", () => {
      reflector.get.mockReturnValue(undefined);
      const context = createMockContext({
        id: "user-1",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith("roles", context.getHandler());
    });

    it("should return false when roles array is empty (edge case)", () => {
      reflector.get.mockReturnValue([]);
      const context = createMockContext({
        id: "user-1",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true when roles includes "ALL"', () => {
      reflector.get.mockReturnValue(["ALL"]);
      const context = createMockContext({
        id: "user-1",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when roles includes "ALL" among other roles', () => {
      reflector.get.mockReturnValue([Role.ADMIN, "ALL"]);
      const context = createMockContext({
        id: "user-1",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false when user is not in request", () => {
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return false when user is undefined", () => {
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return true when user has matching role (ADMIN)", () => {
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({
        id: "admin-1",
        email: "admin@test.com",
        role: Role.ADMIN,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when user has matching role (USER)", () => {
      reflector.get.mockReturnValue([Role.USER]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false when user role does not match required role", () => {
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return true when CHECK_USER_IN_SERVICE is set", () => {
      reflector.get.mockReturnValue(["CHECK_USER_IN_SERVICE"]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when CHECK_USER_IN_SERVICE is among other roles", () => {
      reflector.get.mockReturnValue([Role.ADMIN, "CHECK_USER_IN_SERVICE"]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should handle multiple roles with OR logic - user has one of them", () => {
      reflector.get.mockReturnValue([Role.ADMIN, Role.USER]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should handle multiple roles with OR logic - user has none", () => {
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({
        id: "user-1",
        email: "user@test.com",
        role: Role.USER,
        createdAt: new Date(),
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should correctly extract user from HTTP request", () => {
      const mockUser = {
        id: "test-id",
        email: "test@test.com",
        role: Role.ADMIN,
        createdAt: new Date(),
      };
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(mockUser);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp).toHaveBeenCalled();
    });
  });
});
