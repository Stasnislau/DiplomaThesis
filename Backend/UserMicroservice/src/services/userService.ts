import { Language, User } from "@prisma/client";
import { PrismaService } from "../prisma/prismaService";

import { Injectable } from "@nestjs/common";
import { BaseResponse } from "src/types/BaseResponse";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getLanguages() : Promise<BaseResponse<Language[]>> {
    const languages = await this.prisma.language.findMany();

    return {
      success: true,
      payload: languages,
    };
  }


  async getUser(id: string) : Promise<BaseResponse<User>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

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
  }) {
    await this.prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        surname: userData.surname,
        role: userData.role,
      },
    });

    return {
      success: true,
      payload: true,
    };
  }
}
