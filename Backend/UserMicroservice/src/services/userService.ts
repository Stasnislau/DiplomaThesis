import { Language, User } from "@prisma/client";
import { PrismaService } from "../prisma/prismaService";

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { BaseResponse } from "src/types/BaseResponse";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getLanguages(): Promise<BaseResponse<Language[]>> {
    const languages = await this.prisma.language.findMany();

    return {
      success: true,
      payload: languages,
    };
  }

  async getUser(id: string): Promise<BaseResponse<User>> {
    if (!id) {
      throw new BadRequestException("User ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      success: true,
      payload: user,
    };
  }

  async createUser(userData: {
    id: string;
    email: string;
    name: string;
    surname: string;
    role: string;
    createdAt: Date;
  }) {
    await this.prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        surname: userData.surname,
        role: userData.role,
        createdAt: userData.createdAt,
      },
    });

    return {
      success: true,
      payload: true,
    };
  }

  async updateUser(userData: {
    id: string;
    email: string;
    name: string;
    surname: string;
  }) {
    await this.prisma.user.update({
      where: { id: userData.id },
      data: {
        name: userData.name,
        surname: userData.surname,
      },
    });

    return {
      success: true,
      payload: true,
    };
  }

  async updateUserRole(userData: { id: string; role: string }) {
    if (!userData.id || !userData.role) {
      throw new BadRequestException("User ID and role are required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userData.id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.user.update({
      where: { id: userData.id },
      data: { role: userData.role },
    });

    return {
      success: true,
      payload: true,
    };
  }

  async deleteUser(userData: { id: string }) {
    if (!userData.id) {
      throw new BadRequestException("User ID is required");
    }

    await this.prisma.user.delete({ where: { id: userData.id } });

    return {
      success: true,
      payload: true,
    };
  }
}
