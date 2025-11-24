import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prismaService';

@Injectable()
export class AiProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.aIProvider.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}

