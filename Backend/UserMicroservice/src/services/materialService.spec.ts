import { Test, TestingModule } from "@nestjs/testing";

import { MaterialService } from "./materialService";
import { PrismaService } from "../../prisma/prismaService";

describe("MaterialService", () => {
  let service: MaterialService;
  let prisma: jest.Mocked<PrismaService>;

  const mockMaterial = {
    id: "material-123",
    userId: "user-123",
    filename: "vocabulary.pdf",
    analyzedTypes: ["vocabulary", "grammar"],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      userMaterial: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MaterialService>(MaterialService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create new material", async () => {
      const createDto = {
        filename: "vocabulary.pdf",
        analyzedTypes: ["vocabulary", "grammar"],
      };
      (prisma.userMaterial.create as jest.Mock).mockResolvedValue(mockMaterial);

      const result = await service.create("user-123", createDto);

      expect(result).toEqual(mockMaterial);
      expect(prisma.userMaterial.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          filename: "vocabulary.pdf",
          analyzedTypes: ["vocabulary", "grammar"],
        },
      });
    });
  });

  describe("findAllForUser", () => {
    it("should return all materials for user ordered by date", async () => {
      const materials = [mockMaterial, { ...mockMaterial, id: "material-456" }];
      (prisma.userMaterial.findMany as jest.Mock).mockResolvedValue(materials);

      const result = await service.findAllForUser("user-123");

      expect(result).toHaveLength(2);
      expect(prisma.userMaterial.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when no materials", async () => {
      (prisma.userMaterial.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForUser("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return material by id and userId", async () => {
      (prisma.userMaterial.findFirst as jest.Mock).mockResolvedValue(
        mockMaterial,
      );

      const result = await service.findOne("material-123", "user-123");

      expect(result).toEqual(mockMaterial);
      expect(prisma.userMaterial.findFirst).toHaveBeenCalledWith({
        where: { id: "material-123", userId: "user-123" },
      });
    });

    it("should return null when material not found", async () => {
      (prisma.userMaterial.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne("nonexistent", "user-123");

      expect(result).toBeNull();
    });
  });
});
