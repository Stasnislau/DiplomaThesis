import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prismaService';
import { CreateUserAITokenDto } from '../dtos/createUserAIToken.dto';

@Injectable()
export class UserAITokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createUserAITokenDto: CreateUserAITokenDto) {
    return this.prisma.userAIToken.create({
      data: {
        userId,
        ...createUserAITokenDto,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.userAIToken.findMany({
      where: {
        userId,
      },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.userAIToken.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    // First, verify the token belongs to the user to prevent unauthorized deletion
    const token = await this.findOne(id, userId);
    if (!token) {
      return null;
    }
    return this.prisma.userAIToken.delete({
      where: {
        id,
      },
    });
  }
}
