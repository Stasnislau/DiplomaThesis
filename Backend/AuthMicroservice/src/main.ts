import { Logger, ValidationPipe } from "@nestjs/common";

import { AppModule } from "./appModule";
import { ConfigService } from "@nestjs/config";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const logger = new Logger("AuthMicroservice");
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ErrorHandlingMiddleware());
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ],
    credentials: true,
  });
  const configService = app.get(ConfigService);

  const port = configService.get("PORT");
  await app.listen(port);
  logger.log(`Auth Microservice is running on port: ${port}`);
}
bootstrap();
