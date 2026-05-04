import { Logger, ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

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
  // cookie-parser is required for refresh-token cookie reads on
  // /auth/refresh and /auth/logout. Without it req.cookies is
  // undefined and refresh silently fails.
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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>("rabbitmq.url")],
      queue: configService.get<string>("rabbitmq.queue"),
      queueOptions: {
        durable: false,
      },
    },
  });

  await app.startAllMicroservices();
  const port = configService.get("PORT");
  await app.listen(port);
  logger.log(`Auth Microservice is running on port: ${port}`);
}
bootstrap();
