import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { LanguageLevel } from "@prisma/client";
import { PrismaService } from "../../prisma/prismaService";
import { AchievementService } from "./achievementService";
import { UserService } from "./userService";

describe("UserService", () => {
  let service: UserService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: "user-123",
    email: "test@test.com",
    name: "John",
    surname: "Doe",
    role: "USER",
    xp: 0,
    streak: 0,
    lastActivityDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    languages: [],
  };

  const mockLanguage = {
    id: "lang-1",
    name: "English",
    code: "en",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      language: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      userLanguage: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const mockAchievementService = {
      updateProgress: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AchievementService, useValue: mockAchievementService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getLanguages", () => {
    it("should return all languages", async () => {
      const languages = [
        mockLanguage,
        { id: "lang-2", name: "Polish", code: "pl" },
      ];
      (prisma.language.findMany as jest.Mock).mockResolvedValue(languages);

      const result = await service.getLanguages();

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(languages);
      expect(prisma.language.findMany).toHaveBeenCalled();
    });

    it("should return empty array when no languages exist", async () => {
      (prisma.language.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getLanguages();

      expect(result.success).toBe(true);
      expect(result.payload).toEqual([]);
    });
  });

  describe("getUser", () => {
    it("should return user by ID", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getUser("user-123");

      expect(result.success).toBe(true);
      expect(result.payload).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        include: { languages: true },
      });
    });

    it("should throw BadRequestException when ID is empty", async () => {
      await expect(service.getUser("")).rejects.toThrow(BadRequestException);
      await expect(service.getUser("")).rejects.toThrow("User ID is required");
    });

    it("should throw NotFoundException when user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUser("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUser("nonexistent")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const users = [mockUser, { ...mockUser, id: "user-456" }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.getUsers();

      expect(result.success).toBe(true);
      expect(result.payload).toHaveLength(2);
    });
  });

  describe("createUser", () => {
    it("should create new user", async () => {
      const userData = {
        id: "new-user",
        email: "new@test.com",
        name: "Jane",
        surname: "Doe",
        role: "USER",
        createdAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(userData);

      const result = await service.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.payload).toBe(true);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe("updateUser", () => {
    it("should update existing user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        name: "Updated",
      });

      const result = await service.updateUser({
        id: "user-123",
        name: "Updated",
        surname: "Doe",
      });

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException when user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUser({
          id: "nonexistent",
          name: "Test",
          surname: "User",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateUserRole", () => {
    it("should update user role", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: "ADMIN",
      });

      const result = await service.updateUserRole({
        id: "user-123",
        role: "ADMIN",
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { role: "ADMIN" },
      });
    });

    it("should throw BadRequestException when ID or role is missing", async () => {
      await expect(
        service.updateUserRole({ id: "", role: "ADMIN" }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateUserRole({ id: "user-123", role: "" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUserRole({ id: "nonexistent", role: "ADMIN" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteUser", () => {
    it("should delete user", async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.deleteUser({ id: "user-123" });

      expect(result.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
    });

    it("should throw BadRequestException when ID is missing", async () => {
      await expect(service.deleteUser({ id: "" })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("setNativeLanguage", () => {
    beforeEach(() => {
      (prisma.userLanguage as any).update = jest.fn().mockResolvedValue({});
    });

    it("creates a new native language row when user has none", async () => {
      (prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "lang-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        languages: [],
      });
      (prisma.userLanguage.create as jest.Mock).mockResolvedValue({});

      const result = await service.setNativeLanguage("user-123", "lang-1");

      expect(result.success).toBe(true);
      expect(prisma.userLanguage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LanguageLevel.NATIVE,
          languageId: "lang-1",
          userId: "user-123",
          isNative: true,
          isStarted: true,
        }),
      });
    });

    it("is idempotent when re-picking the same native language", async () => {
      (prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "lang-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        languages: [
          { id: "ul-1", languageId: "lang-1", isNative: true },
        ],
      });

      const result = await service.setNativeLanguage("user-123", "lang-1");

      expect(result.success).toBe(true);
      expect(prisma.userLanguage.create).not.toHaveBeenCalled();
      // Existing row promoted (no-op effectively, but the call goes through)
      expect((prisma.userLanguage as any).update).toHaveBeenCalledWith({
        where: { id: "ul-1" },
        data: expect.objectContaining({ isNative: true }),
      });
    });

    it("demotes old native and promotes new one when switching", async () => {
      (prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "lang-2" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        languages: [
          { id: "ul-1", languageId: "lang-1", isNative: true },
          { id: "ul-2", languageId: "lang-2", isNative: false, level: "B1" },
        ],
      });

      await service.setNativeLanguage("user-123", "lang-2");

      // Old native demoted
      expect((prisma.userLanguage as any).update).toHaveBeenCalledWith({
        where: { id: "ul-1" },
        data: { isNative: false },
      });
      // Existing target row promoted (no fresh create)
      expect((prisma.userLanguage as any).update).toHaveBeenCalledWith({
        where: { id: "ul-2" },
        data: expect.objectContaining({
          isNative: true,
          level: LanguageLevel.NATIVE,
        }),
      });
      expect(prisma.userLanguage.create).not.toHaveBeenCalled();
    });

    it("creates a new row when switching to a brand-new language", async () => {
      (prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "lang-2" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        languages: [
          { id: "ul-1", languageId: "lang-1", isNative: true },
        ],
      });
      (prisma.userLanguage.create as jest.Mock).mockResolvedValue({});

      await service.setNativeLanguage("user-123", "lang-2");

      // Old native demoted
      expect((prisma.userLanguage as any).update).toHaveBeenCalledWith({
        where: { id: "ul-1" },
        data: { isNative: false },
      });
      // New row created for lang-2
      expect(prisma.userLanguage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          languageId: "lang-2",
          isNative: true,
          level: LanguageLevel.NATIVE,
        }),
      });
    });

    it("throws NotFoundException when user not found", async () => {
      (prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "lang-1" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setNativeLanguage("nonexistent", "lang-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("addUserLanguage", () => {
    it("should add user language with valid level", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(mockLanguage);
      (prisma.userLanguage.create as jest.Mock).mockResolvedValue({});

      const result = await service.addUserLanguage("user-123", "lang-1", "B1");

      expect(result.success).toBe(true);
      expect(prisma.userLanguage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: LanguageLevel.B1,
          languageId: "lang-1",
          userId: "user-123",
          isNative: false,
        }),
      });
    });

    it("should throw BadRequestException for invalid level", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(mockLanguage);

      await expect(
        service.addUserLanguage("user-123", "lang-1", "INVALID"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle all valid CEFR levels", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(mockLanguage);
      (prisma.userLanguage.create as jest.Mock).mockResolvedValue({});

      const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

      for (const level of levels) {
        await service.addUserLanguage("user-123", "lang-1", level);
      }

      expect(prisma.userLanguage.create).toHaveBeenCalledTimes(6);
    });

    it("should throw NotFoundException if user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addUserLanguage("nonexistent", "lang-1", "A1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if language not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addUserLanguage("user-123", "nonexistent", "A1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserLocale", () => {
    it("returns the native language code in lowercase", async () => {
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue({
        language: { code: "PL" },
      });
      await expect(service.getUserLocale("user-123")).resolves.toBe("pl");
    });

    it("returns 'es' for Spanish natives", async () => {
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue({
        language: { code: "es" },
      });
      await expect(service.getUserLocale("user-123")).resolves.toBe("es");
    });

    it("falls back to 'en' when user has no native language row", async () => {
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getUserLocale("user-123")).resolves.toBe("en");
    });

    it("falls back to 'en' for unsupported language codes", async () => {
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue({
        language: { code: "ru" },
      });
      await expect(service.getUserLocale("user-123")).resolves.toBe("en");
    });
  });
});
