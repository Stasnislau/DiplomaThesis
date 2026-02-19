import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../prisma/prismaService";
import { UserAITokensService } from "./user-ai-tokens.service";

describe("UserAITokensService", () => {
  let service: UserAITokensService;
  let prisma: jest.Mocked<PrismaService>;

  const mockToken = {
    id: "token-123",
    userId: "user-123",
    token: "sk-xxx-secret",
    aiProviderId: "openai",
    isDefault: true,
    createdAt: new Date(),
  };

  const mockProvider = {
    id: "openai",
    name: "OpenAI",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      userAIToken: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          userAIToken: {
            updateMany: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue(mockToken),
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAITokensService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserAITokensService>(UserAITokensService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create new AI token", async () => {
      const createDto = {
        token: "sk-xxx-secret",
        aiProviderId: "openai",
        isDefault: false,
      };

      const result = await service.create("user-123", createDto);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should make first token default automatically", async () => {
      const createDto = {
        token: "sk-xxx-secret",
        aiProviderId: "openai",
        isDefault: false,
      };

      await service.create("user-123", createDto);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("findAllForUser", () => {
    it("should return all tokens for user with masked tokens by default", async () => {
      const tokens = [
        { ...mockToken, token: "sk-very-long-secret-key-12345" },
        {
          ...mockToken,
          id: "token-456",
          isDefault: false,
          token: "sk-another-secret-54321",
        },
      ];
      // @ts-ignore
      (prisma.userAIToken.findMany as jest.Mock).mockResolvedValue(tokens);

      const result = await service.findAllForUser("user-123");

      expect(result).toHaveLength(2);
      expect(result[0].token).toBe("sk-v...2345");
      expect(result[1].token).toBe("sk-a...4321");
      expect(prisma.userAIToken.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        include: { aiProvider: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
    });

    it("should return unmasked tokens when includeToken is true", async () => {
      const tokens = [{ ...mockToken, token: "sk-very-long-secret-key-12345" }];
      // @ts-ignore
      (prisma.userAIToken.findMany as jest.Mock).mockResolvedValue(tokens);

      const result = await service.findAllForUser("user-123", true);

      expect(result[0].token).toBe("sk-very-long-secret-key-12345");
    });

    it("should return empty array when no tokens", async () => {
      // @ts-ignore
      (prisma.userAIToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForUser("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return masked token by id and userId", async () => {
      // @ts-ignore
      (prisma.userAIToken.findFirst as jest.Mock).mockResolvedValue({
        ...mockToken,
        token: "sk-very-long-secret-key-12345",
      });

      const result = await service.findOne("token-123", "user-123");

      expect(result).toBeDefined();
      expect(result?.token).toBe("sk-v...2345");
      expect(prisma.userAIToken.findFirst).toHaveBeenCalledWith({
        where: { id: "token-123", userId: "user-123" },
        include: { aiProvider: true },
      });
    });

    it("should return null when token not found", async () => {
      // @ts-ignore
      (prisma.userAIToken.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne("nonexistent", "user-123");

      expect(result).toBeNull();
    });
  });

  describe("remove", () => {
    it("should delete token and return masked result if it belongs to user", async () => {
      // @ts-ignore
      (prisma.userAIToken.findFirst as jest.Mock).mockResolvedValue(mockToken);
      // @ts-ignore
      (prisma.userAIToken.delete as jest.Mock).mockResolvedValue({
        ...mockToken,
        token: "sk-very-long-secret-key-12345",
      });

      const result = await service.remove("token-123", "user-123");

      expect(result).toBeDefined();
      expect(result?.token).toBe("sk-v...2345");
      expect(prisma.userAIToken.delete).toHaveBeenCalledWith({
        where: { id: "token-123" },
      });
    });

    it("should return null if token does not belong to user", async () => {
      // @ts-ignore
      (prisma.userAIToken.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.remove("token-123", "wrong-user");

      expect(result).toBeNull();
      expect(prisma.userAIToken.delete).not.toHaveBeenCalled();
    });
  });
});
