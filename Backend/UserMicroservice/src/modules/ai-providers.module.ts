import { Module } from '@nestjs/common';
import { AiProvidersController } from '../controllers/ai-providers.controller';
import { AiProvidersService } from '../services/ai-providers.service';
import { PrismaService } from 'prisma/prismaService';

@Module({
  controllers: [AiProvidersController],
  providers: [AiProvidersService, PrismaService],
})
export class AiProvidersModule {}

