import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "prisma/prismaService";

export interface AchievementDefinition {
  name: string;
  description: string;
  icon: string;
  category: string;
  maxProgress: number;
  isHidden: boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    name: "First Steps",
    description: "Complete your first placement test",
    icon: "🎓",
    category: "learning",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Bookworm",
    description: "Complete 10 reading tasks",
    icon: "📚",
    category: "learning",
    maxProgress: 10,
    isHidden: false,
  },
  {
    name: "Grammar Guru",
    description: "Complete 25 grammar tasks without errors",
    icon: "✍️",
    category: "learning",
    maxProgress: 25,
    isHidden: false,
  },
  {
    name: "Vocabulary Builder",
    description: "Learn 100 new words across all languages",
    icon: "🔤",
    category: "learning",
    maxProgress: 100,
    isHidden: false,
  },

  {
    name: "Voice Activated",
    description: "Complete your first speech analysis",
    icon: "🎙️",
    category: "speaking",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Silver Tongue",
    description: "Achieve 80%+ fluency score in speech analysis",
    icon: "🗣️",
    category: "speaking",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Orator",
    description: "Complete 10 speech analyses",
    icon: "🏛️",
    category: "speaking",
    maxProgress: 10,
    isHidden: false,
  },

  {
    name: "On Fire",
    description: "Maintain a 3-day learning streak",
    icon: "🔥",
    category: "streak",
    maxProgress: 3,
    isHidden: false,
  },
  {
    name: "Unstoppable",
    description: "Maintain a 7-day learning streak",
    icon: "💪",
    category: "streak",
    maxProgress: 7,
    isHidden: false,
  },
  {
    name: "Dedicated",
    description: "Maintain a 30-day learning streak",
    icon: "🏆",
    category: "streak",
    maxProgress: 30,
    isHidden: false,
  },

  {
    name: "Explorer",
    description: "Start learning a new language",
    icon: "🧭",
    category: "exploration",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Polyglot",
    description: "Study 3 different languages",
    icon: "🌍",
    category: "exploration",
    maxProgress: 3,
    isHidden: false,
  },
  {
    name: "World Citizen",
    description: "Study 5 different languages",
    icon: "🗺️",
    category: "exploration",
    maxProgress: 5,
    isHidden: false,
  },

  {
    name: "Level Up",
    description: "Reach B1 level in any language",
    icon: "⬆️",
    category: "mastery",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Advanced Speaker",
    description: "Reach C1 level in any language",
    icon: "🌟",
    category: "mastery",
    maxProgress: 1,
    isHidden: false,
  },
  {
    name: "Early Bird",
    description: "Complete a task before 8 AM",
    icon: "☀️",
    category: "streak",
    maxProgress: 1,
    isHidden: true,
  },
];

@Injectable()
export class AchievementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed all achievement definitions into the database.
   * Uses upsert to avoid duplicates.
   */
  async seedAchievements(): Promise<number> {
    let created = 0;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await this.prisma.achievement.upsert({
        where: { name: def.name },
        update: {
          description: def.description,
          icon: def.icon,
          category: def.category,
          maxProgress: def.maxProgress,
          isHidden: def.isHidden,
        },
        create: {
          name: def.name,
          description: def.description,
          icon: def.icon,
          category: def.category,
          maxProgress: def.maxProgress,
          isHidden: def.isHidden,
        },
      });
      created++;
    }
    return created;
  }

  /**
   * Get all achievements with user's progress.
   */
  async getUserAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: {
        isHidden: false,
      },
      include: {
        UserAchievement: {
          where: { userId },
        },
      },
      orderBy: { category: "asc" },
    });

    return achievements.map((ach) => {
      const userAch = ach.UserAchievement[0];
      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        maxProgress: ach.maxProgress,
        progress: userAch?.progress ?? 0,
        isUnlocked: userAch?.unlockedAt != null,
        unlockedAt: userAch?.unlockedAt ?? null,
      };
    });
  }

  /**
   * Get all achievements (including hidden ones that the user has unlocked).
   */
  async getAllUserAchievements(userId: string) {
    const [visible, unlockedHidden] = await Promise.all([
      this.getUserAchievements(userId),
      this.prisma.achievement.findMany({
        where: {
          isHidden: true,
          UserAchievement: {
            some: {
              userId,
              unlockedAt: { not: null },
            },
          },
        },
        include: {
          UserAchievement: {
            where: { userId },
          },
        },
      }),
    ]);

    const hiddenUnlocked = unlockedHidden.map((ach) => {
      const userAch = ach.UserAchievement[0];
      return {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        maxProgress: ach.maxProgress,
        progress: userAch?.progress ?? 0,
        isUnlocked: true,
        unlockedAt: userAch?.unlockedAt ?? null,
      };
    });

    return [...visible, ...hiddenUnlocked];
  }

  /**
   * Update progress for a specific achievement.
   * Automatically unlocks if progress >= maxProgress.
   */
  async updateProgress(
    userId: string,
    achievementName: string,
    incrementBy: number = 1,
  ) {
    const achievement = await this.prisma.achievement.findFirst({
      where: { name: achievementName },
    });

    if (!achievement) {
      throw new NotFoundException(`Achievement "${achievementName}" not found`);
    }

    const existing = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing?.unlockedAt) {
      return existing;
    }

    const newProgress = Math.min(
      (existing?.progress ?? 0) + incrementBy,
      achievement.maxProgress,
    );

    const isNowUnlocked = newProgress >= achievement.maxProgress;

    const result = await this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
      update: {
        progress: newProgress,
        ...(isNowUnlocked ? { unlockedAt: new Date() } : {}),
      },
      create: {
        userId,
        achievementId: achievement.id,
        progress: newProgress,
        ...(isNowUnlocked ? { unlockedAt: new Date() } : {}),
      },
      include: {
        achievement: true,
      },
    });

    return result;
  }

  /**
   * Get count of unlocked achievements for a user.
   */
  async getUnlockedCount(userId: string): Promise<number> {
    return this.prisma.userAchievement.count({
      where: {
        userId,
        unlockedAt: { not: null },
      },
    });
  }
}
