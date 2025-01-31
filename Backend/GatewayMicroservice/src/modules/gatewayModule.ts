import { Module } from "@nestjs/common";
import { GatewayController } from "../controllers/gatewayController";
import { HttpModule } from "@nestjs/axios";
@Module({
  imports: [HttpModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
