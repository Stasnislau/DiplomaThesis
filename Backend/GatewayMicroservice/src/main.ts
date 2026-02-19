import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { urlMiddleware } from "./middlewares/urlMiddleware";

async function bootstrap() {
  const logger = new Logger("GatewayMicroservice");
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ErrorHandlingMiddleware());
  app.useGlobalFilters(urlMiddleware());
  const configService = app.get(ConfigService);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
  });
  const port = configService.get("port");
  await app.listen(port);
  logger.log(`Gateway Microservice is running on port: ${port}`);
}
bootstrap();
