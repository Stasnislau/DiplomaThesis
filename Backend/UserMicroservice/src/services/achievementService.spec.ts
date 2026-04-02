import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "prisma/prismaService";
import { AchievementService, ACHIEVEMENT_DEFINITIONS } from "./achievementService";

describe("AchievementService", () => {
  let service: AchievementService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        {
          provide: PrismaService,
          useValue: {
            achievement: {
              upsert: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            userAchievement: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("seedAchievements", () => {
    it("should seed all achievements", async () => {
      (prisma.achievement.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.seedAchievements();

      expect(result).toBe(ACHIEVEMENT_DEFINITIONS.length);
      expect(prisma.achievement.upsert).toHaveBeenCalledTimes(ACHIEVEMENT_DEFINITIONS.length);
    });
  });

  describe("getUserAchievements", () => {
    it("should return formatted achievements", async () => {
      const mockAchievements = [
        {
          id: "ach-1",
          name: "First Steps",
          description: "Complete your first placement test",
          icon: "🎓",
          category: "learning",
          maxProgress: 1,
          isHidden: false,
          UserAchievement: [{ progress: 1, unlockedAt: new Date(), userId: "user-123" }],
        },
        {
          id: "ach-2",
          name: "Bookworm",
          description: "Complete 10 reading tasks",
          icon: "📚",
          category: "learning",
          maxProgress: 10,
          isHidden: false,
          UserAchievement: [],
        },
      ];

      (prisma.achievement.findMany as jest.Mock).mockResolvedValue(mockAchievements);

      const result = await service.getUserAchievements("user-123");

      expect(prisma.achievement.findMany).toHaveBeenCalledWith({
        where: { isHidden: false },
        include: { UserAchievement: { where: { userId: "user-123" } } },
        orderBy: { category: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0].progress).toBe(1);
      expect(result[0].isUnlocked).toBe(true);
      expect(result[1].progress).toBe(0);
      expect(result[1].isUnlocked).toBe(false);
    });
  });

  describe("getAllUserAchievements", () => {
    it("should include visible and unlocked hidden achievements", async () => {
      const visibleAchievements = [
        {
          id: "ach-1",
          name: "First Steps",
          description: "Desc",
          icon: "🎓",
          category: "learning",
          maxProgress: 1,
          isHidden: false,
          UserAchievement: [],
        },
      ];

      const hiddenUnlockedAchievements = [
        {
          id: "ach-3",
          name: "Early Bird",
          description: "Hidden desc",
          icon: "☀️",
          category: "streak",
          maxProgress: 1,
          isHidden: true,
          UserAchievement: [{ progress: 1, unlockedAt: new Date(), userId: "user-123" }],
        },
      ];

      jest
        .spyOn(service, "getUserAchievements")
        .mockResolvedValueOnce([{
          id: "ach-1",
          name: "First Steps",
          description: "Desc",
          icon: "🎓",
          category: "learning",
          maxProgress: 1,
          progress: 0,
          isUnlocked: false,
          unlockedAt: null,
        }]);

      (prisma.achievement.findMany as jest.Mock).mockResolvedValue(hiddenUnlockedAchievements);

      const result = await service.getAllUserAchievements("user-123");

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe("Early Bird");
      expect(result[1].isUnlocked).toBe(true);
      expect(result[1].progress).toBe(1);
    });
  });

  describe("updateProgress", () => {
    it("should update progress and unlock achievement if maxProgress is reached", async () => {
      const mockAchievement = { id: "ach-1", name: "Bookworm", maxProgress: 10 };
      const mockExistingUserAchievement = { progress: 5, unlockedAt: null };

      (prisma.achievement.findFirst as jest.Mock).mockResolvedValue(mockAchievement);
      (prisma.userAchievement.findUnique as jest.Mock).mockResolvedValue(mockExistingUserAchievement);
      (prisma.userAchievement.upsert as jest.Mock).mockResolvedValue({
        progress: 10,
        unlockedAt: expect.any(Date),
      });

      const result = await service.updateProgress("user-123", "Bookworm", 5);

      expect(prisma.userAchievement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ progress: 10, unlockedAt: expect.any(Date) }),
        })
      );
    });

    it("should return existing if already unlocked", async () => {
      const mockAchievement = { id: "ach-1", name: "Bookworm", maxProgress: 10 };
      const mockExistingUserAchievement = { progress: 10, unlockedAt: new Date() };

      (prisma.achievement.findFirst as jest.Mock).mockResolvedValue(mockAchievement);
      (prisma.userAchievement.findUnique as jest.Mock).mockResolvedValue(mockExistingUserAchievement);

      const result = await service.updateProgress("user-123", "Bookworm", 1);

      expect(result).toEqual(mockExistingUserAchievement);
      expect(prisma.userAchievement.upsert).not.toHaveBeenCalled();
    });

    it("should seed achievements if achievement not found initially, then find it", async () => {
      jest.spyOn(service, "seedAchievements").mockResolvedValueOnce(1);
      
      const mockAchievement = { id: "ach-1", name: "Bookworm", maxProgress: 10 };
      
      (prisma.achievement.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAchievement);
        
      (prisma.userAchievement.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userAchievement.upsert as jest.Mock).mockResolvedValue({ progress: 1 });

      await service.updateProgress("user-123", "Bookworm", 1);

      expect(service.seedAchievements).toHaveBeenCalled();
      expect(prisma.userAchievement.upsert).toHaveBeenCalled();
    });

    it("should throw NotFoundException if achievement still not found after seeding", async () => {
      jest.spyOn(service, "seedAchievements").mockResolvedValueOnce(1);
      
      (prisma.achievement.findFirst as jest.Mock).mockResolvedValue(null);
        
      await expect(service.updateProgress("user-123", "Unknown", 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUnlockedCount", () => {
    it("should return the count of unlocked achievements", async () => {
      (prisma.userAchievement.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnlockedCount("user-123");

      expect(result).toBe(5);
      expect(prisma.userAchievement.count).toHaveBeenCalledWith({
        where: { userId: "user-123", unlockedAt: { not: null } },
      });
    });
  });
});
