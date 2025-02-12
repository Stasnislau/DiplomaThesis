import { Module } from "@nestjs/common";
import { GatewayController } from "../controllers/gatewayController";
import { HttpModule } from "@nestjs/axios";
import { GatewayService } from "../services/gatewayService";
@Module({
  imports: [HttpModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
