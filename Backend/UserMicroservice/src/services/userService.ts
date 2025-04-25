import { PrismaService } from "../prisma/prismaService";

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Language, LanguageLevel, User } from "@prisma/client";
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
      include: {
        languages: true,
      },
    });

    console.log(user, "me");

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      success: true,
      payload: user,
    };
  }

  async getUsers(): Promise<BaseResponse<User[]>> {
    const users = await this.prisma.user.findMany(
    );

    return {
      success: true,
      payload: users,
    };
  }

  async addLanguage(userId: string, languageId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!language) {  
      throw new NotFoundException("Language not found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { languages: { connect: { id: languageId } } },
    });
    return {
      success: true,
      payload: true,
    };
  }

  async setNativeLanguage(userId: string, languageId: string) {
    console.log(userId + " " + languageId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        languages: true,
      },
    });
    
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.languages.find((language) => language.languageId === languageId)) {
      throw new BadRequestException("Language already added");
    }
    const newLanguage = await this.prisma.userLanguage.create({
      data: {
        id: languageId,
        currentLevel: LanguageLevel.NATIVE,
        languageId: languageId,
        userId: userId,
      },
    });
    console.log(newLanguage);
    return {
      success: true,
      payload: true,
    };
  }

  async addUserLanguage(userId: string, languageId: string, level: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!language) {
      throw new NotFoundException("Language not found");
    }

    let currentLevel: LanguageLevel;

    switch (level) {
      case "A1":
        currentLevel = LanguageLevel.A1;
        break;
      case "A2":
        currentLevel = LanguageLevel.A2;
        break;
      case "B1":
        currentLevel = LanguageLevel.B1;
        break;
      case "B2":
        currentLevel = LanguageLevel.B2;
        break;
      case "C1":
        currentLevel = LanguageLevel.C1;
        break;
      case "C2":
        currentLevel = LanguageLevel.C2;
        break;
      default:
        throw new BadRequestException("Invalid level");
    }

    const newLanguage = await this.prisma.userLanguage.create({
      data: { id: languageId, currentLevel: currentLevel, languageId: languageId, userId: userId },
    });

    return {
      success: true,
      payload: true,
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
