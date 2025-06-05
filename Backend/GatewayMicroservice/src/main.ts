import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { ErrorHandlingMiddleware } from "./middlewares/errorHandlingMiddleware";
import { urlMiddleware } from "./middlewares/urlMiddleware";

async function bootstrap() {
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
  console.log(`GatewayMicroservice is running on port ${port}`);
}
bootstrap();
