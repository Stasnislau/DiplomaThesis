import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prismaService';
import { CreateUserAITokenDto } from '../dtos/createUserAIToken.dto';

@Injectable()
export class UserAITokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createUserAITokenDto: CreateUserAITokenDto) {
    return this.prisma.$transaction(async (tx) => {
      // If the new token is set as default, unset other defaults for this user
      if (createUserAITokenDto.isDefault) {
        await tx.userAIToken.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // If this is the FIRST token for the user, make it default automatically
      const count = await tx.userAIToken.count({ where: { userId } });
      const isDefault = createUserAITokenDto.isDefault || count === 0;

      return tx.userAIToken.create({
      data: {
        userId,
          token: createUserAITokenDto.token,
          aiProviderId: createUserAITokenDto.aiProviderId,
          isDefault: isDefault,
      },
      });
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.userAIToken.findMany({
      where: {
        userId,
      },
      include: {
        aiProvider: true,
      },
      orderBy: [
        { isDefault: 'desc' }, // Defaults first
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.userAIToken.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        aiProvider: true,
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
