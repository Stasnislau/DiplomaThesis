import { CreateUserMaterialDto } from "../dtos/createMaterial.dto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { USER_ID_REQUIRED, throwWithCode } from "../utils/errorCodes";
import { Prisma } from "@prisma/client";
import { PrismaService } from "prisma/prismaService";

@Injectable()
export class MaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createMaterialDto: CreateUserMaterialDto) {
    return this.prisma.userMaterial.create({
      data: {
        userId,
        filename: createMaterialDto.filename,
        analyzedTypes: createMaterialDto.analyzedTypes as Prisma.InputJsonValue,
      },
    });
  }

  async findAllForUser(userId: string) {
    // Every other read in this service is scoped by owner. Without
    // this guard a call that arrives with no identity would query for
    // `userId: undefined` and quietly return a page of nothing, which
    // reads to the caller like an empty library rather than a refusal.
    if (!userId) {
      throwWithCode(
        USER_ID_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "User ID is required",
      );
    }

    return this.prisma.userMaterial.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
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
