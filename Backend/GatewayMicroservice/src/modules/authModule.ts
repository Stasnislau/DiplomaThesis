import { Module } from "@nestjs/common";
import { AuthController } from "../controllers/authController";
import { HttpModule } from "@nestjs/axios";
@Module({
  imports: [HttpModule],
  controllers: [AuthController],
})
export class AuthModule {}
