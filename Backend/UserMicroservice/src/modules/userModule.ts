import { Module } from "@nestjs/common";
import { UserService } from "../services/userService";
import { UserController } from "../controllers/userController";
import { PrismaService } from "../prisma/prismaService";
import { EventModule } from "./eventModule";

@Module({
  imports: [EventModule],
  providers: [UserService, PrismaService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
