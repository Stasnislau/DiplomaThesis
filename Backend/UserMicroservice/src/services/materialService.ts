import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prismaService';
import { CreateUserMaterialDto } from '../dtos/createMaterial.dto';

@Injectable()
export class MaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createMaterialDto: CreateUserMaterialDto) {
    return this.prisma.userMaterial.create({
      data: {
        userId,
        filename: createMaterialDto.filename,
        analyzedTypes: createMaterialDto.analyzedTypes,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.userMaterial.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.userMaterial.findFirst({
      where: {
        id,
        userId,
      },
    });
  }
}

