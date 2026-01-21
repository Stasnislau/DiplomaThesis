import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role, User } from "@prisma/client";
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
    } as unknown as ExecutionContext
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
      const context = createMockContext({ id: "user-1", email: "test@test.com", role: Role.USER, createdAt: new Date() });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith("roles", context.getHandler());
    });

    it("should return false when roles array is empty (edge case)", () => {
      reflector.get.mockReturnValue([]);
      const context = createMockContext({ id: "user-1", email: "test@test.com", role: Role.USER, createdAt: new Date() });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true when roles includes "ALL"', () => {
      // Arrange
      reflector.get.mockReturnValue(["ALL"]);
      const context = createMockContext({ id: "user-1", email: "test@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when roles includes "ALL" among other roles', () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN, "ALL"]);
      const context = createMockContext({ id: "user-1", email: "test@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user is not in request", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(null);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when user is undefined", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(undefined);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when user has matching role (ADMIN)", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({ id: "admin-1", email: "admin@test.com", role: Role.ADMIN, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when user has matching role (USER)", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.USER]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user role does not match required role", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when CHECK_USER_IN_SERVICE is set", () => {
      // Arrange - CHECK_USER_IN_SERVICE means "let the service handle authorization"
      reflector.get.mockReturnValue(["CHECK_USER_IN_SERVICE"]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when CHECK_USER_IN_SERVICE is among other roles", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN, "CHECK_USER_IN_SERVICE"]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert - Even if user is not ADMIN, CHECK_USER_IN_SERVICE allows through
      expect(result).toBe(true);
    });

    it("should handle multiple roles with OR logic - user has one of them", () => {
      // Arrange
      reflector.get.mockReturnValue([Role.ADMIN, Role.USER]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert - User has USER role, which is in the allowed list
      expect(result).toBe(true);
    });

    it("should handle multiple roles with OR logic - user has none", () => {
      // Arrange - Assuming there's a MODERATOR role or similar
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext({ id: "user-1", email: "user@test.com", role: Role.USER, createdAt: new Date() });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it("should correctly extract user from HTTP request", () => {
      // Arrange
      const mockUser = {
        id: "test-id",
        email: "test@test.com",
        role: Role.ADMIN,
        createdAt: new Date(),
      };
      reflector.get.mockReturnValue([Role.ADMIN]);
      const context = createMockContext(mockUser);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(context.switchToHttp).toHaveBeenCalled();
    });
  });
});
