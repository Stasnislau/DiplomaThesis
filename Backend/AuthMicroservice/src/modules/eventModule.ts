import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigService, ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "EVENT_SERVICE",
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>("rabbitmq.url")],
            queue: configService.get<string>("rabbitmq.queue"),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class EventModule {}
