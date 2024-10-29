import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BridgeController } from '../controllers/bridgeController';

@Module({
  imports: [HttpModule],
  controllers: [BridgeController],
})
export class BridgeModule {}