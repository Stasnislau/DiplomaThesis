import { Language, User } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { UserController } from "./userController";
import { UserService } from "../services/userService";
import { MailerService } from "../services/mailerService";

describe("UserController", () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  let mailerService: jest.Mocked<MailerService>;

  const mockUser: User = {
    id: "user-123",
    email: "test@test.com",
    name: "John",
    surname: "Doe",
    role: "USER",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLanguage: Language = {
    id: "lang-1",
    name: "English",
    code: "en",
  };

  const mockRequest = {
    user: {
      id: "user-123",
      email: "test@test.com",
      role: "USER",
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const mockUserService = {
      getLanguages: jest.fn(),
      addUserLanguage: jest.fn(),
      getUser: jest.fn(),
      getUsers: jest.fn(),
      setNativeLanguage: jest.fn(),
      updateUser: jest.fn(),
      createUser: jest.fn(),
      updateUserRole: jest.fn(),
      deleteUser: jest.fn(),
      getUserLocale: jest.fn(),
    };

    const mockMailerService = {
      sendPasswordReset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    mailerService = module.get(MailerService) as jest.Mocked<MailerService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getLanguages", () => {
    it("should return languages", async () => {
      const languages = [mockLanguage];
      userService.getLanguages.mockResolvedValue({
        success: true,
        payload: languages,
      });

      const result = await controller.getLanguages();

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(languages);
      expect(userService.getLanguages).toHaveBeenCalled();
    });
  });

  describe("addUserLanguage", () => {
    it("should add user language", async () => {
      userService.addUserLanguage.mockResolvedValue({
        success: true,
        payload: true,
      });

      const result = await controller.addUserLanguage(
        { languageId: "lang-1", level: "B1" },
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(userService.addUserLanguage).toHaveBeenCalledWith(
        "user-123",
        "lang-1",
        "B1",
      );
    });
  });

  describe("getUser", () => {
    it("should return current user", async () => {
      userService.getUser.mockResolvedValue({
        success: true,
        payload: mockUser,
      });

      const result = await controller.getUser(mockRequest);

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockUser);
      expect(userService.getUser).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({ email: expect.any(String) }),
      );
    });
  });

  describe("setNativeLanguage", () => {
    it("should set native language", async () => {
      userService.setNativeLanguage.mockResolvedValue({
        success: true,
        payload: true,
      });

      const result = await controller.setNativeLanguage(
        { languageId: "lang-1" },
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(userService.setNativeLanguage).toHaveBeenCalledWith(
        "user-123",
        "lang-1",
      );
    });
  });

  describe("updateUser", () => {
    it("should update user", async () => {
      userService.updateUser.mockResolvedValue(true);

      const result = await controller.updateUser(
        { name: "Updated", surname: "User" },
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(result.payload).toBe(true);
      expect(userService.updateUser).toHaveBeenCalledWith({
        id: "user-123",
        name: "Updated",
        surname: "User",
        email: undefined,
      });
    });
  });

  describe("Event Handlers", () => {
    it("should handle user.created", async () => {
      await controller.handleUserCreated(mockUser);
      expect(userService.createUser).toHaveBeenCalledWith(mockUser);
    });

    it("should handle user.updatedRole", async () => {
      const payload = { id: "user-123", role: "ADMIN" };
      await controller.handleUserUpdatedRole(payload);
      expect(userService.updateUserRole).toHaveBeenCalledWith(payload);
    });

    it("should handle user.deleted", async () => {
      const payload = { id: "user-123" };
      await controller.handleUserDeleted(payload);
      expect(userService.deleteUser).toHaveBeenCalledWith(payload);
    });

    it("should handle password.reset and forward to mailer with locale", async () => {
      userService.getUserLocale.mockResolvedValue("pl");
      const payload = {
        id: "user-123",
        email: "test@test.com",
        newPassword: "new-uuid-pass",
      };

      await controller.handlePasswordReset(payload);

      expect(userService.getUserLocale).toHaveBeenCalledWith("user-123");
      expect(mailerService.sendPasswordReset).toHaveBeenCalledWith(
        "test@test.com",
        "new-uuid-pass",
        "pl",
      );
    });

    it("should default to en locale when user has no native language", async () => {
      userService.getUserLocale.mockResolvedValue("en");
      const payload = {
        id: "user-456",
        email: "newbie@test.com",
        newPassword: "another-pass",
      };

      await controller.handlePasswordReset(payload);

      expect(mailerService.sendPasswordReset).toHaveBeenCalledWith(
        "newbie@test.com",
        "another-pass",
        "en",
      );
    });
  });
});
