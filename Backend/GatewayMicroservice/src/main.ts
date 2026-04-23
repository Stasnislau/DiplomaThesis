import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { urlMiddleware } from "./middlewares/urlMiddleware";
import helmet from "helmet";

async function bootstrap() {
  const logger = new Logger("GatewayMicroservice");
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalFilters(new ErrorHandlingMiddleware());
  app.useGlobalFilters(urlMiddleware());
  const configService = app.get(ConfigService);
  app.setGlobalPrefix("api");
  const allowedOrigins = (configService.get<string>("ALLOWED_ORIGINS") || "http://localhost:3000,http://localhost:5173").split(",");
  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  const port = configService.get("port");
  await app.listen(port);
  logger.log(`Gateway Microservice is running on port: ${port}`);
}
bootstrap();
