import { Injectable, NotFoundException } from "@nestjs/common";

import { AchievementService } from "./achievementService";
import { PrismaService } from "prisma/prismaService";

@Injectable()
export class PlacementTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementService: AchievementService,
  ) {}

  async saveResult(data: {
    userId: string;
    languageId: string;
    level: string;
    score: number;
    feedback: any;
  }) {
    // 1. Save the detailed result
    const result = await this.prisma.placementTestResult.create({
      data: {
        userId: data.userId,
        languageId: data.languageId,
        level: data.level,
        score: data.score,
        feedback: data.feedback,
      },
    });

    // 2. Update or Create UserLanguage level
    // We check if the user already has this language.
    const userLanguage = await this.prisma.userLanguage.findFirst({
      where: {
        userId: data.userId,
        languageId: data.languageId,
      },
    });

    if (userLanguage) {
      await this.prisma.userLanguage.update({
        where: { id: userLanguage.id },
        data: {
          level: data.level,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.userLanguage.create({
        data: {
          userId: data.userId,
          languageId: data.languageId,
          level: data.level,
          isStarted: true,
          isNative: false,
        },
      });
    }

    // 3. Unlock "First Steps" achievement
    await this.achievementService.updateProgress(data.userId, "First Steps", 1);

    return result;
  }
}
