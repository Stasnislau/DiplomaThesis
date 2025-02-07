import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import configuration from "./config/configuration";
import { AuthModule } from "./modules/authModule";
import { JwtPayloadMiddleware } from "./middlewares/jwtPayloadMiddleware";
import { EventModule } from "./modules/eventModule";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
    AuthModule,
    EventModule,
  ],
  controllers: [],
  providers: [JwtPayloadMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtPayloadMiddleware).forRoutes("*");
  }
}
