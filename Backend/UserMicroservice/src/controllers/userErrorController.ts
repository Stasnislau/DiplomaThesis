import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
} from "@nestjs/common";

import { UserErrorService } from "../services/userErrorService";
import { RecordUserErrorDto } from "../dtos/recordUserError.dto";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";

@Controller("user-errors")
export class UserErrorController {
  constructor(private readonly userErrorService: UserErrorService) {}

  /**
   * Record a recurring error (FR6). Designed to be called by the AI
   * microservice after grading (speaking analysis, essay evaluation),
   * never by the end user directly — without the internal-service-key
   * gate any USER could forge an arbitrary error log for themselves.
   */
  @Post()
  async record(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RecordUserErrorDto,
  ) {
    const internalKey = req.headers["x-internal-service-key"] as
      | string
      | undefined;
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected || internalKey !== expected) {
      throw new ForbiddenException(
        "FORBIDDEN_INTERNAL: This endpoint is internal-only.",
      );
    }

    const result = await this.userErrorService.record({
      userId: req.user.id,
      languageCode: dto.languageCode,
      errorText: dto.errorText,
      correction: dto.correction,
      errorType: dto.errorType,
      source: dto.source,
      context: dto.context,
    });

    return { success: true, payload: result };
  }

  /**
   * List the signed-in user's recurring errors for a language,
   * ordered most-frequent then most-recent — the visible FR6 log.
   */
  @Get()
  async list(
    @Request() req: AuthenticatedRequest,
    @Query("languageCode") languageCode: string,
  ) {
    const result = await this.userErrorService.listForUser(
      req.user.id,
      languageCode,
    );
    return { success: true, payload: result };
  }
}
