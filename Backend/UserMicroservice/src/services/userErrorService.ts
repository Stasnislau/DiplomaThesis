import { Injectable } from "@nestjs/common";
import { HttpStatus } from "@nestjs/common";

import { PrismaService } from "prisma/prismaService";
import {
  USER_LANGUAGE_NOT_FOUND,
  throwWithCode,
} from "../utils/errorCodes";

export interface RecordUserErrorData {
  userId: string;
  languageCode: string;
  errorText: string;
  correction: string;
  errorType: string;
  source: string;
  context?: string;
}

@Injectable()
export class UserErrorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a recurring error (FR6). Upsert semantics on
   * (userId, languageId, errorType, errorText): if a matching row
   * already exists, bump its frequency and refresh lastOccurredAt;
   * otherwise create it.
   *
   * There is no DB unique constraint on that tuple, so we do the
   * find-then-update/create dance manually — same approach the
   * placement-test flow uses for its user-language upsert.
   */
  async record(data: RecordUserErrorData) {
    const language = await this.prisma.language.findFirst({
      where: { code: data.languageCode },
    });

    if (!language) {
      throwWithCode(
        USER_LANGUAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        `Language with code ${data.languageCode} not found`,
      );
    }

    const existing = await this.prisma.userError.findFirst({
      where: {
        userId: data.userId,
        languageId: language.id,
        errorType: data.errorType,
        errorText: data.errorText,
      },
    });

    if (existing) {
      return this.prisma.userError.update({
        where: { id: existing.id },
        data: {
          frequency: existing.frequency + 1,
          lastOccurredAt: new Date(),
          // Keep the latest correction/context/source — the newest
          // grading run is the most relevant one to show the user.
          correction: data.correction,
          source: data.source,
          context: data.context ?? null,
        },
      });
    }

    return this.prisma.userError.create({
      data: {
        userId: data.userId,
        languageId: language.id,
        errorText: data.errorText,
        correction: data.correction,
        errorType: data.errorType,
        source: data.source,
        context: data.context ?? null,
      },
    });
  }

  /**
   * List a user's recurring errors for a given language, most
   * frequent / most recent first — the actual FR6 "log".
   */
  async listForUser(userId: string, languageCode: string) {
    const language = await this.prisma.language.findFirst({
      where: { code: languageCode },
    });

    if (!language) {
      throwWithCode(
        USER_LANGUAGE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        `Language with code ${languageCode} not found`,
      );
    }

    return this.prisma.userError.findMany({
      where: {
        userId,
        languageId: language.id,
      },
      orderBy: [{ frequency: "desc" }, { lastOccurredAt: "desc" }],
    });
  }
}
