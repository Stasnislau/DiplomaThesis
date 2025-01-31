import { NestFactory } from "@nestjs/core";
import { AppModule } from "./appModule";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>("rabbitmq.url")],
      queue: configService.get<string>("rabbitmq.queue"),
      queueOptions: {
        durable: true,
      },
    },
  });
  await app.startAllMicroservices();
  const port = configService.get("PORT");
  console.log("Auth Microservice is running on port:", port);
  await app.listen(port);
}
bootstrap();
