import { Test, TestingModule } from "@nestjs/testing";

import { AiProvidersService } from "./ai-providers.service";
import { PrismaService } from "../../prisma/prismaService";

describe("AiProvidersService", () => {
  let service: AiProvidersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockProviders = [
    { id: "openai", name: "OpenAI", createdAt: new Date() },
    { id: "google", name: "Google Gemini", createdAt: new Date() },
    { id: "anthropic", name: "Anthropic Claude", createdAt: new Date() },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      aIProvider: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProvidersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiProvidersService>(AiProvidersService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all AI providers ordered by name", async () => {
      (prisma.aIProvider.findMany as jest.Mock).mockResolvedValue(
        mockProviders,
      );

      const result = await service.findAll();

      expect(result).toEqual(mockProviders);
      expect(result).toHaveLength(3);
      expect(prisma.aIProvider.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });

    it("should return empty array when no providers", async () => {
      (prisma.aIProvider.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
