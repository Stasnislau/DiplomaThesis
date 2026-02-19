import { AchievementModule } from "./achievementModule";
import { Module } from "@nestjs/common";
import { PlacementTestController } from "../controllers/placementTestController";
import { PlacementTestService } from "../services/placementTestService";
import { PrismaService } from "prisma/prismaService";

@Module({
  imports: [AchievementModule],
  controllers: [PlacementTestController],
  providers: [PlacementTestService, PrismaService],
})
export class PlacementTestModule {}
