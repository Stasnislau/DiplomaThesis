import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { GatewayModule } from "./modules/gatewayModule";
import { HttpModule } from "@nestjs/axios";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 60,
      },
    ]),
    GatewayModule,
    HttpModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
