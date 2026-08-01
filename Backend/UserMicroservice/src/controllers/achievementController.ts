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

  @Get("count")
  async getUnlockedCount(@Request() req: AuthenticatedRequest) {
    const count = await this.achievementService.getUnlockedCount(req.user.id);
    return {
      success: true,
      payload: { count },
    };
  }

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
