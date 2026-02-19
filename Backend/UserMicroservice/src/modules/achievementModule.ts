import { AchievementController } from "../controllers/achievementController";
import { AchievementService } from "../services/achievementService";
import { Module } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";

@Module({
  controllers: [AchievementController],
  providers: [AchievementService, PrismaService],
  exports: [AchievementService],
})
export class AchievementModule {}
