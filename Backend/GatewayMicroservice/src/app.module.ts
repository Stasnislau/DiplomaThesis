import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GatewayModule } from "./modules/gatewayModule";
import { HttpModule } from "@nestjs/axios";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    GatewayModule,
    HttpModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
