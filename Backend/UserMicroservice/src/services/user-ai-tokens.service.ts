import { CreateUserAITokenDto } from "../dtos/createUserAIToken.dto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";

@Injectable()
export class UserAITokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createUserAITokenDto: CreateUserAITokenDto) {
    const createdToken = await this.prisma.$transaction(async (tx) => {
      if (createUserAITokenDto.isDefault) {
        await tx.userAIToken.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

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

    return { ...createdToken, token: this.maskToken(createdToken.token) };
  }

  async findAllForUser(userId: string, includeToken = false) {
    const tokens = await this.prisma.userAIToken.findMany({
      where: {
        userId,
      },
      include: {
        aiProvider: true,
      },
      orderBy: [
        { isDefault: "desc" }, // Default s first
        { createdAt: "desc" },
      ],
    });

    return tokens.map((t) => ({
      ...t,
      token: includeToken ? t.token : this.maskToken(t.token),
    }));
  }

  async findOne(id: string, userId: string) {
    const token = await this.prisma.userAIToken.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        aiProvider: true,
      },
    });

    if (!token) return null;

    return { ...token, token: this.maskToken(token.token) };
  }

  async remove(id: string, userId: string) {
    const token = await this.prisma.userAIToken.findFirst({
      where: { id, userId },
    });

    if (!token) {
      return null;
    }

    const deletedToken = await this.prisma.userAIToken.delete({
      where: {
        id,
      },
    });

    return { ...deletedToken, token: this.maskToken(deletedToken.token) };
  }

  async setDefault(id: string, userId: string) {
    const updatedToken = await this.prisma.$transaction(async (tx) => {
      const token = await tx.userAIToken.findFirst({
        where: { id, userId },
      });

      if (!token) {
        return null;
      }

      await tx.userAIToken.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.userAIToken.update({
        where: { id },
        data: { isDefault: true },
        include: { aiProvider: true },
      });
    });

    if (!updatedToken) return null;

    return { ...updatedToken, token: this.maskToken(updatedToken.token) };
  }

  private maskToken(token: string): string {
    if (!token) return "";
    if (token.length <= 8) return "********";
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}
