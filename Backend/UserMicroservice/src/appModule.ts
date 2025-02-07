import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { UserModule } from "./modules/userModule";
import { EventModule } from "./modules/eventModule";
import { UserDataMiddleware } from "./middlewares/userDataMiddleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],

      isGlobal: true,
    }),
    UserModule,
    EventModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserDataMiddleware).forRoutes("*");
  }
}
