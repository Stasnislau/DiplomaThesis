import { Module } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";
import { TaskHistoryController } from "../controllers/task-history.controller";
import { TaskHistoryService } from "../services/task-history.service";

@Module({
  imports: [],
  controllers: [TaskHistoryController],
  providers: [TaskHistoryService, PrismaService],
})
export class TaskHistoryModule {}
