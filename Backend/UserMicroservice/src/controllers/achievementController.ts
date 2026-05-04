import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AchievementService } from "../services/achievementService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { Roles } from "../guards/roles.decorator";
import { RolesGuard } from "../guards/rolesGuard";

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
   * Seed achievements into the database. ADMIN-only — without the
   * guard, any authenticated user could upsert/replay rows.
   */
  @Post("seed")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async seedAchievements() {
    const count = await this.achievementService.seedAchievements();
    return {
      success: true,
      payload: { seeded: count },
    };
  }

  /**
   * Update progress for a specific achievement. Designed to be
   * called by Bridge (which awards progress on lesson completion,
   * speech analysis, etc.) — never by the end user directly. Without
   * the internal-service-key gate, any USER could just POST
   * {"achievementName":"Dedicated"} repeatedly to fake-unlock every
   * achievement on the platform.
   */
  @Post("progress")
  async updateProgress(
    @Request() req: AuthenticatedRequest,
    @Body() body: { achievementName: string; incrementBy?: number },
  ) {
    const internalKey = req.headers["x-internal-service-key"] as
      | string
      | undefined;
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected || internalKey !== expected) {
      throw new ForbiddenException(
        "FORBIDDEN_INTERNAL: This endpoint is internal-only.",
      );
    }
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
