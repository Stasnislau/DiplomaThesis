import { Module } from '@nestjs/common';
import { UserAITokensController } from '../controllers/user-ai-tokens.controller';
import { UserAITokensService } from '../services/user-ai-tokens.service';
import { PrismaService } from 'prisma/prismaService';

@Module({
  imports: [],
  controllers: [UserAITokensController],
  providers: [UserAITokensService, PrismaService],
})
export class UserAITokensModule {}
