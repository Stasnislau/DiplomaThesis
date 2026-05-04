import { Test, TestingModule } from "@nestjs/testing";

import { AuthController } from "./authController";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { JwtAuthGuard } from "../guards/jwtAuthGuard";
import { LoginDto } from "../dtos/loginDto";
import { Role } from "@prisma/client";
import { RolesGuard } from "../guards/rolesGuard";
import { UserDto } from "../dtos/userDto";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: UserDto = {
    email: "test@test.com",
    name: "John",
    surname: "Doe",
    password: "password123",
  };

  const mockLoginDto: LoginDto = {
    email: "test@test.com",
    password: "password123",
  };

  const mockTokenResponse = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      removeRefreshToken: jest.fn(),
      resetPassword: jest.fn(),
      getAllUsers: jest.fn(),
      updatePassword: jest.fn(),
      updateUserRole: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should return access token + set refresh cookie on success", async () => {
      authService.login.mockResolvedValue(mockTokenResponse);

      const mockReq = {
        headers: { "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" },
        ip: "127.0.0.1",
      } as any;
      const mockRes = { cookie: jest.fn() } as any;
      const result = await controller.login(mockLoginDto, mockReq, mockRes);

      expect(result.success).toBe(true);
      expect(result.payload.accessToken).toBe(mockTokenResponse.accessToken);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        mockTokenResponse.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe("register", () => {
    it("should return success on registration", async () => {
      authService.register.mockResolvedValue(true);

      const result = await controller.register(mockUser);

      expect(result.success).toBe(true);
      expect(result.payload).toBe(true);
      expect(authService.register).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("refreshToken", () => {
    it("returns access token, reads refresh from cookie, rotates cookie", async () => {
      authService.refreshToken.mockResolvedValue(mockTokenResponse);

      const mockReq = {
        cookies: { refreshToken: "from-cookie" },
        headers: { "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" },
        ip: "127.0.0.1",
      } as any;
      const mockRes = { cookie: jest.fn() } as any;
      const result = await controller.refreshToken(mockReq, undefined, mockRes);

      expect(result.success).toBe(true);
      expect(result.payload.accessToken).toBe(mockTokenResponse.accessToken);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        "from-cookie",
        expect.any(String),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        mockTokenResponse.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe("logout", () => {
    it("removes the stored refresh token and clears the cookie", async () => {
      authService.removeRefreshToken.mockResolvedValue(undefined);

      const mockReq = {
        cookies: { refreshToken: "from-cookie" },
        headers: {},
      } as any;
      const mockRes = { clearCookie: jest.fn() } as any;
      const result = await controller.logout(mockReq, undefined, mockRes);

      expect(result.success).toBe(true);
      expect(result.payload).toBe("Logged out successfully");
      expect(authService.removeRefreshToken).toHaveBeenCalledWith("from-cookie");
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(Object),
      );
    });
  });

  describe("resetPassword", () => {
    it("should call resetPassword service", async () => {
      authService.resetPassword.mockResolvedValue("new-password");

      const result = await controller.resetPassword("test@test.com");

      expect(result.success).toBe(true);
      expect(result.payload).toBe("Password has been reset");
      expect(authService.resetPassword).toHaveBeenCalledWith("test@test.com");
    });
  });

  describe("validateToken", () => {
    it("should return user details", async () => {
      const req = {
        user: {
          id: "user-123",
          email: "test@test.com",
          role: "USER",
        },
      } as AuthenticatedRequest;

      const result = await controller.validateToken(req);

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(req.user);
    });
  });

  describe("getAllUsers", () => {
    it("should return all users", async () => {
      const mockUsers = [
        {
          id: "1",
          email: "test@test.com",
          name: "Test",
          surname: "User",
          role: "USER" as Role,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      authService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockUsers);
      expect(authService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe("updatePassword", () => {
    it("should update password", async () => {
      const req = {
        user: { id: "user-123" },
      } as AuthenticatedRequest;
      const body = { oldPassword: "old", newPassword: "new" };

      authService.updatePassword.mockResolvedValue(undefined);

      const result = await controller.updatePassword(req, body);

      expect(result.success).toBe(true);
      expect(result.payload).toBe("Password updated successfully");
      expect(authService.updatePassword).toHaveBeenCalledWith(
        "user-123",
        "old",
        "new",
      );
    });
  });

  describe("updateRole", () => {
    it("should update user role to ADMIN", async () => {
      authService.updateUserRole.mockResolvedValue(undefined);

      const result = await controller.updateRole({ id: "user-123", role: "ADMIN" });

      expect(result.success).toBe(true);
      expect(result.payload).toBe("User role updated successfully");
      expect(authService.updateUserRole).toHaveBeenCalledWith({
        id: "user-123",
        role: "ADMIN",
      });
    });

    it("should update user role to USER", async () => {
      authService.updateUserRole.mockResolvedValue(undefined);

      const result = await controller.updateRole({ id: "user-456", role: "USER" });

      expect(result.success).toBe(true);
      expect(authService.updateUserRole).toHaveBeenCalledWith({
        id: "user-456",
        role: "USER",
      });
    });

    it("should propagate service error", async () => {
      authService.updateUserRole.mockRejectedValue(
        new Error("User not found")
      );

      await expect(
        controller.updateRole({ id: "bad-id", role: "ADMIN" })
      ).rejects.toThrow("User not found");
    });
  });

  describe("deleteUser", () => {
    it("should delete user by id", async () => {
      authService.deleteUser.mockResolvedValue(undefined);

      const result = await controller.deleteUser("user-123");

      expect(result.success).toBe(true);
      expect(result.payload).toBe("User deleted successfully");
      expect(authService.deleteUser).toHaveBeenCalledWith({ id: "user-123" });
    });

    it("should propagate service error when user not found", async () => {
      authService.deleteUser.mockRejectedValue(
        new Error("User not found")
      );

      await expect(controller.deleteUser("bad-id")).rejects.toThrow(
        "User not found"
      );
    });
  });
});
