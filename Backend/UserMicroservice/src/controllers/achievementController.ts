import { Controller, Get, Post, Body, Request } from "@nestjs/common";
import { AchievementService } from "../services/achievementService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";

@Controller("achievements")
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  /**
   * Get all achievements with user's progress.
   * Hidden achievements only show if unlocked.
   */
  @Get()
  async getUserAchievements(@Request() req: AuthenticatedRequest) {
    const achievements = await this.achievementService.getAllUserAchievements(
      req.user.id,
    );
    return {
      success: true,
      payload: achievements,
    };
  }

  /**
   * Get count of unlocked achievements.
   */
  @Get("count")
  async getUnlockedCount(@Request() req: AuthenticatedRequest) {
    const count = await this.achievementService.getUnlockedCount(req.user.id);
    return {
      success: true,
      payload: { count },
    };
  }

  /**
   * Seed achievements into the database (admin-only in production).
   */
  @Post("seed")
  async seedAchievements() {
    const count = await this.achievementService.seedAchievements();
    return {
      success: true,
      payload: { seeded: count },
    };
  }

  /**
   * Update progress for a specific achievement (for testing/manual triggers).
   */
  @Post("progress")
  async updateProgress(
    @Request() req: AuthenticatedRequest,
    @Body() body: { achievementName: string; incrementBy?: number },
  ) {
    const result = await this.achievementService.updateProgress(
      req.user.id,
      body.achievementName,
      body.incrementBy ?? 1,
    );
    return {
      success: true,
      payload: result,
    };
  }
}
