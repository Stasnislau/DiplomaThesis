import { Test, TestingModule } from "@nestjs/testing";
import { PlacementTestService } from "./placementTestService";
import { PrismaService } from "prisma/prismaService";
import { AchievementService } from "./achievementService";

describe("PlacementTestService", () => {
  let service: PlacementTestService;
  let prisma: PrismaService;
  let achievementService: AchievementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacementTestService,
        {
          provide: PrismaService,
          useValue: {
            placementTestResult: {
              create: jest.fn(),
            },
            userLanguage: {
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: AchievementService,
          useValue: {
            updateProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlacementTestService>(PlacementTestService);
    prisma = module.get<PrismaService>(PrismaService);
    achievementService = module.get<AchievementService>(AchievementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("saveResult", () => {
    it("should save result and update user language if it exists", async () => {
      const mockData = {
        userId: "user-123",
        languageId: "lang-abc",
        level: "B1",
        score: 85,
        feedback: { notes: "Good job!" },
      };

      const mockUserLanguage = { id: "ul-1", userId: "user-123", languageId: "lang-abc" };
      const mockResult = { id: "res-1", ...mockData };

      (prisma.placementTestResult.create as jest.Mock).mockResolvedValue(mockResult);
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue(mockUserLanguage);
      (prisma.userLanguage.update as jest.Mock).mockResolvedValue({});

      const result = await service.saveResult(mockData);

      expect(prisma.placementTestResult.create).toHaveBeenCalledWith({
        data: {
          userId: mockData.userId,
          languageId: mockData.languageId,
          level: mockData.level,
          score: mockData.score,
          feedback: mockData.feedback,
        },
      });

      expect(prisma.userLanguage.update).toHaveBeenCalledWith({
        where: { id: mockUserLanguage.id },
        data: {
          level: mockData.level,
          updatedAt: expect.any(Date),
        },
      });

      expect(prisma.userLanguage.create).not.toHaveBeenCalled();
      expect(achievementService.updateProgress).toHaveBeenCalledWith(mockData.userId, "First Steps", 1);
      expect(result).toEqual(mockResult);
    });

    it("should save result and create user language if it does not exist", async () => {
      const mockData = {
        userId: "user-123",
        languageId: "lang-abc",
        level: "A2",
        score: 60,
        feedback: { notes: "Keep practicing." },
      };

      const mockResult = { id: "res-2", ...mockData };

      (prisma.placementTestResult.create as jest.Mock).mockResolvedValue(mockResult);
      (prisma.userLanguage.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userLanguage.create as jest.Mock).mockResolvedValue({});

      await service.saveResult(mockData);

      expect(prisma.userLanguage.create).toHaveBeenCalledWith({
        data: {
          userId: mockData.userId,
          languageId: mockData.languageId,
          level: mockData.level,
          isStarted: true,
          isNative: false,
        },
      });

      expect(prisma.userLanguage.update).not.toHaveBeenCalled();
      expect(achievementService.updateProgress).toHaveBeenCalledWith(mockData.userId, "First Steps", 1);
    });
  });
});
