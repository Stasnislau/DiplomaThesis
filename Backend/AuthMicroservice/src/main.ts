import { NestFactory } from "@nestjs/core";
import { AppModule } from "./appModule";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ErrorHandlingMiddleware());
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
  });
  const configService = app.get(ConfigService);
  const port = configService.get("PORT");
  console.log("Auth Microservice is running on port:", port);
  await app.listen(port);
}
bootstrap();
