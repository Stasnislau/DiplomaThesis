import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { LanguageLevel } from "@prisma/client";
import { PrismaService } from "../../prisma/prismaService";
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
    createdAt: new Date(),
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
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getLanguages ====================
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

  // ==================== getUser ====================
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

  // ==================== getUsers ====================
  describe("getUsers", () => {
    it("should return all users", async () => {
      const users = [mockUser, { ...mockUser, id: "user-456" }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.getUsers();

      expect(result.success).toBe(true);
      expect(result.payload).toHaveLength(2);
    });
  });

  // ==================== createUser ====================
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

  // ==================== updateUser ====================
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

  // ==================== updateUserRole ====================
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

  // ==================== deleteUser ====================
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

  // ==================== addLanguage ====================
  describe("addLanguage", () => {
    it("should add language to user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(mockLanguage);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        languages: [mockLanguage],
      });

      const result = await service.addLanguage("user-123", "lang-1");

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("should throw NotFoundException when user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addLanguage("nonexistent", "lang-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when language not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.language.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addLanguage("user-123", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== addUserLanguage ====================
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
  });
});
