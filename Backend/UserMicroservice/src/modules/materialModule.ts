import { Module } from '@nestjs/common';
import { MaterialController } from '../controllers/materialController';
import { MaterialService } from '../services/materialService';
import { PrismaService } from 'prisma/prismaService';

@Module({
  controllers: [MaterialController],
  providers: [MaterialService, PrismaService],
})
export class MaterialModule {}

