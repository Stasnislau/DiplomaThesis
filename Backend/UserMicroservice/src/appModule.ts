import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { UserModule } from "./modules/userModule";
import { UserAITokensModule } from "./modules/user-ai-tokens.module";
import { AiProvidersModule } from "./modules/ai-providers.module";
import { UserDataMiddleware } from "./middlewares/userDataMiddleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],

      isGlobal: true,
    }),
    UserModule,
    UserAITokensModule,
    AiProvidersModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserDataMiddleware).forRoutes("*");
  }
}
