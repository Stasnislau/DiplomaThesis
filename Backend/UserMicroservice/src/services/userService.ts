import { HttpStatus, Injectable } from "@nestjs/common";
import { Language, LanguageLevel, User } from "@prisma/client";

import { BaseResponse } from "src/types/BaseResponse";
import { PrismaService } from "../../prisma/prismaService";
import { AchievementService } from "./achievementService";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementService: AchievementService,
  ) {}

  async getLanguages(): Promise<BaseResponse<Language[]>> {
    const languages = await this.prisma.language.findMany();

    return {
      success: true,
      payload: languages,
    };
  }

  async getUser(
    id: string,
    fallback?: { email?: string; role?: string },
  ): Promise<BaseResponse<User>> {
    if (!id) {
      throwWithCode(USER_ID_REQUIRED, HttpStatus.BAD_REQUEST, "User ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        languages: true,
      },
    });

    if (user) {
      return { success: true, payload: user };
    }

    // Lazy upsert: the `user.created` event from Auth may not have
    // landed yet (RabbitMQ outage / message dropped). Auth has
    // already created the credentials row, so the gateway-validated
    // `id` in the request is authoritative — synthesise the missing
    // profile from the headers we just got. Without this, /me 404s
    // forever for any user whose registration event was lost.
    if (!fallback?.email) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    // The user.created event from Auth carries name + surname; in the
    // rare case where it never arrived (lazy upsert path) we don't
    // know them. Use an empty string placeholder; the user can fill
    // their profile via PUT /updateUser. The schema requires non-null
    // strings, so empty is the cleanest sentinel here.
    const created = await this.prisma.user.create({
      data: {
        id,
        email: fallback.email,
        name: "",
        surname: "",
        role: fallback.role ?? "USER",
      },
      include: { languages: true },
    });
    return { success: true, payload: created };
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

    // Idempotent set-native flow:
    //   1. Demote whatever was previously the user's native language.
    //   2. If they already had a row for the target language (any
    //      level), promote it to native; otherwise create one.
    // Without this the call would either 409 "already added" when
    // re-picking the same language, or end up with two `isNative=true`
    // rows when switching native.
    const existingNative = user.languages.find((l) => l.isNative);
    if (existingNative && existingNative.languageId !== languageId) {
      await this.prisma.userLanguage.update({
        where: { id: existingNative.id },
        data: { isNative: false },
      });
    }

    const existingForTarget = user.languages.find(
      (l) => l.languageId === languageId,
    );
    if (existingForTarget) {
      await this.prisma.userLanguage.update({
        where: { id: existingForTarget.id },
        data: { isNative: true, level: LanguageLevel.NATIVE, isStarted: true },
      });
    } else {
      await this.prisma.userLanguage.create({
        data: {
          level: LanguageLevel.NATIVE,
          languageId,
          userId,
          isStarted: true,
          isNative: true,
        },
      });
    }

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

  /**
   * Record activity for the day: add xpGained to the user's total XP,
   * maintain the daily streak counter, and update streak-based achievements.
   *
   * Streak rules (UTC day boundaries):
   *   - No previous activity OR gap > 1 day  → reset streak to 1
   *   - Last activity was yesterday            → streak += 1
   *   - Last activity was today                → keep (idempotent same-day)
   */
  async updateActivity(
    userId: string,
    xpGained: number,
  ): Promise<{ xp: number; streak: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throwWithCode(USER_NOT_FOUND, HttpStatus.NOT_FOUND, "User not found");
    }

    const now = new Date();
    // Start-of-day in UTC — compare calendar days, not timestamps.
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    let newStreak = user.streak;
    let streakIncreasedToday = false;

    if (!user.lastActivityDate) {
      // First ever activity.
      newStreak = 1;
      streakIncreasedToday = true;
    } else {
      const lastUTC = new Date(
        Date.UTC(
          user.lastActivityDate.getUTCFullYear(),
          user.lastActivityDate.getUTCMonth(),
          user.lastActivityDate.getUTCDate(),
        ),
      );
      const diffDays = Math.round(
        (todayUTC.getTime() - lastUTC.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        // Same calendar day — no streak change (idempotent).
      } else if (diffDays === 1) {
        // Consecutive day — extend streak.
        newStreak = user.streak + 1;
        streakIncreasedToday = true;
      } else {
        // Gap of 2+ days — streak broken.
        newStreak = 1;
        streakIncreasedToday = true;
      }
    }

    const newXp = user.xp + xpGained;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        streak: newStreak,
        lastActivityDate: now,
      },
    });

    // Only award streak achievements when the streak actually moved
    // forward (new day), not on repeated same-day calls.
    if (streakIncreasedToday) {
      await Promise.allSettled([
        this.achievementService.updateProgress(userId, "On Fire", 1),
        this.achievementService.updateProgress(userId, "Unstoppable", 1),
        this.achievementService.updateProgress(userId, "Dedicated", 1),
      ]);
    }

    return { xp: newXp, streak: newStreak };
  }

  // Returns the user's native-language ISO code (en/pl/es). Falls back
  // to "en" if the user has no profile yet or no native language picked
  // — used by the mailer to localise password-reset templates.
  async getUserLocale(userId: string): Promise<string> {
    const native = await this.prisma.userLanguage.findFirst({
      where: { userId, isNative: true },
      include: { language: true },
    });
    const code = native?.language?.code?.toLowerCase();
    if (code === "pl" || code === "es") return code;
    return "en";
  }
}
