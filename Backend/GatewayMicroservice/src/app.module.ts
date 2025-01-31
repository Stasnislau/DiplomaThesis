import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GatewayModule } from "./modules/gatewayModule";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GatewayModule,
  ],
})
export class AppModule {}
