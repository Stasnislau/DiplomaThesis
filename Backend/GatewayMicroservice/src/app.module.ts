import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/authModule';
import { BridgeModule } from './modules/bridgeModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    BridgeModule,
  ],
})
export class AppModule {}