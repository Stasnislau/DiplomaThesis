import { Logger, ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

import { AppModule } from "./appModule";
import { ConfigService } from "@nestjs/config";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { NestFactory } from "@nestjs/core";

async function bootstrap() {
  const logger = new Logger("UserMicroservice");
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ErrorHandlingMiddleware());
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix("api");
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
  logger.log(`User Microservice is running on port: ${port}`);
}
bootstrap();
