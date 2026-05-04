import { Module } from "@nestjs/common";
import { GatewayController } from "../controllers/gatewayController";
import { HealthController } from "../controllers/healthController";
import { HttpModule } from "@nestjs/axios";
import { GatewayService } from "../services/gatewayService";
@Module({
  imports: [HttpModule],
  controllers: [GatewayController, HealthController],
  providers: [GatewayService],
})
export class GatewayModule {}
