import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { AchievementModule } from "./modules/achievementModule";
import { AiProvidersModule } from "./modules/ai-providers.module";
import { ConfigModule } from "@nestjs/config";
import { MaterialModule } from "./modules/materialModule";
import { PlacementTestModule } from "./modules/placementTestModule";
import { TaskHistoryModule } from "./modules/task-history.module";
import { UserAITokensModule } from "./modules/user-ai-tokens.module";
import { UserDataMiddleware } from "./middlewares/userDataMiddleware";
import { UserModule } from "./modules/userModule";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],

      isGlobal: true,
    }),
    UserModule,
    UserAITokensModule,
    AiProvidersModule,
    MaterialModule,
    AchievementModule,
    PlacementTestModule,
    TaskHistoryModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserDataMiddleware).forRoutes("*");
  }
}
