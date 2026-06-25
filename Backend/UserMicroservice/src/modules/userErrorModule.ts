import { Module } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";
import { UserErrorController } from "../controllers/userErrorController";
import { UserErrorService } from "../services/userErrorService";

@Module({
  imports: [],
  controllers: [UserErrorController],
  providers: [UserErrorService, PrismaService],
})
export class UserErrorModule {}
