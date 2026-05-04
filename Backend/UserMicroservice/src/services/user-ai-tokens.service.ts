import { CreateUserAITokenDto } from "../dtos/createUserAIToken.dto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prismaService";
import {
  decryptSecret,
  encryptSecret,
  looksEncrypted,
} from "../utils/secretCipher";

@Injectable()
export class UserAITokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** Decrypt the stored envelope to its plaintext token. Rows still
   *  in plaintext from before encrypt-at-rest landed are detected via
   *  `looksEncrypted` and passed through, so the service keeps working
   *  during the migration window. */
  private readPlaintext(stored: string): string {
    return looksEncrypted(stored) ? decryptSecret(stored) : stored;
  }

  async create(userId: string, createUserAITokenDto: CreateUserAITokenDto) {
    const ciphertext = encryptSecret(createUserAITokenDto.token);
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
          token: ciphertext,
          aiProviderId: createUserAITokenDto.aiProviderId,
          isDefault: isDefault,
        },
      });
    });

    return {
      ...createdToken,
      token: this.maskToken(createUserAITokenDto.token),
    };
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

    return tokens.map((t) => {
      const plain = this.readPlaintext(t.token);
      return {
        ...t,
        token: includeToken ? plain : this.maskToken(plain),
      };
    });
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

    return {
      ...token,
      token: this.maskToken(this.readPlaintext(token.token)),
    };
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

    return {
      ...deletedToken,
      token: this.maskToken(this.readPlaintext(deletedToken.token)),
    };
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

    return {
      ...updatedToken,
      token: this.maskToken(this.readPlaintext(updatedToken.token)),
    };
  }

  private maskToken(token: string): string {
    if (!token) return "";
    if (token.length <= 8) return "********";
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}
