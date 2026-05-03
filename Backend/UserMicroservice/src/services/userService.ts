import { HttpStatus, Injectable } from "@nestjs/common";
import { Language, LanguageLevel, User } from "@prisma/client";

import { BaseResponse } from "src/types/BaseResponse";
import { PrismaService } from "../../prisma/prismaService";
import {
  USER_ID_AND_ROLE_REQUIRED,
  USER_ID_REQUIRED,
  USER_INVALID_LEVEL,
  USER_LANGUAGE_ALREADY_ADDED,
  USER_LANGUAGE_ID_MISSING,
  USER_LANGUAGE_NOT_FOUND,
  USER_NOT_FOUND,
  throwWithCode,
} from "../utils/errorCodes";

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
      throwWithCode(USER_ID_REQUIRED, HttpStatus.BAD_REQUEST, "User ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        languages: true,
      },
    });

    if (!user) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    return {
      success: true,
      payload: user,
    };
  }

  async getUsers(): Promise<BaseResponse<User[]>> {
    const users = await this.prisma.user.findMany();

    return {
      success: true,
      payload: users,
    };
  }

  async setNativeLanguage(userId: string, languageId: string) {
    if (!languageId) {
      throwWithCode(
        USER_LANGUAGE_ID_MISSING,
        HttpStatus.BAD_REQUEST,
        "Language ID is missing",
      );
    }
    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
    });
    if (!language) {
      throwWithCode(
        USER_LANGUAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        `Language with id ${languageId} not found`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        languages: true,
      },
    });

    if (!user) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    if (user.languages.find((language) => language.languageId === languageId)) {
      throwWithCode(
        USER_LANGUAGE_ALREADY_ADDED,
        HttpStatus.CONFLICT,
        "Language already added",
      );
    }

    await this.prisma.userLanguage.create({
      data: {
        level: LanguageLevel.NATIVE,
        languageId: languageId,
        userId: userId,
        isStarted: true,
        isNative: true,
      },
    });

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
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    const language = await this.prisma.language.findUnique({
      where: { id: languageId },
    });

    if (!language) {
      throwWithCode(
        USER_LANGUAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        "Language not found",
      );
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
        throwWithCode(
          USER_INVALID_LEVEL,
          HttpStatus.BAD_REQUEST,
          "Invalid level",
        );
    }

    await this.prisma.userLanguage.create({
      data: {
        level: currentLevel,
        languageId: languageId,
        userId: userId,
        isStarted: true,
        isNative: false,
      },
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
    name: string;
    surname: string;
    email?: string;
  }): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userData.id },
    });
    if (!user) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }
    await this.prisma.user.update({
      where: { id: userData.id },
      data: userData,
    });
    return true;
  }

  async updateUserRole(userData: { id: string; role: string }) {
    if (!userData.id || !userData.role) {
      throwWithCode(
        USER_ID_AND_ROLE_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "User ID and role are required",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userData.id },
    });

    if (!user) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
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
      throwWithCode(
        USER_ID_REQUIRED,
        HttpStatus.BAD_REQUEST,
        "User ID is required",
      );
    }

    await this.prisma.user.delete({ where: { id: userData.id } });

    return {
      success: true,
      payload: true,
    };
  }
}
