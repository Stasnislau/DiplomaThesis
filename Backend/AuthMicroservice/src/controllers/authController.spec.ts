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
    it("should return tokens on successful login", async () => {
      authService.login.mockResolvedValue(mockTokenResponse);

      const result = await controller.login(mockLoginDto);

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockTokenResponse);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
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
    it("should return new tokens", async () => {
      authService.refreshToken.mockResolvedValue(mockTokenResponse);

      const result = await controller.refreshToken("old-refresh-token");

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockTokenResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        "old-refresh-token",
      );
    });
  });

  describe("logout", () => {
    it("should remove refresh token", async () => {
      authService.removeRefreshToken.mockResolvedValue(undefined);

      const result = await controller.logout("refresh-token");

      expect(result.success).toBe(true);
      expect(result.payload).toBe("Logged out successfully");
      expect(authService.removeRefreshToken).toHaveBeenCalledWith(
        "refresh-token",
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
});
