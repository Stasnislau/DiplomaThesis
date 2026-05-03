import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import {
  CreateTaskHistoryDto,
  TaskHistoryService,
} from "../services/task-history.service";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import {
  USER_HISTORY_MISSING_USER,
  throwWithCode,
} from "../utils/errorCodes";

@Controller("history")
export class TaskHistoryController {
  constructor(private readonly historyService: TaskHistoryService) {}

  /**
   * Create a history entry. Reachable by:
   *   1. End user via gateway → records own activity (rare; usually Bridge logs).
   *   2. Bridge service via x-internal-service-key with x-user-id of the acting user.
   */
  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateTaskHistoryDto,
  ) {
    const internalKey = req.headers["x-internal-service-key"];
    const isInternal =
      !!internalKey && internalKey === process.env.INTERNAL_SERVICE_KEY;

    const userId = isInternal
      ? (req.headers["x-user-id"] as string | undefined)
      : req.user?.id;

    if (!userId) {
      throwWithCode(
        USER_HISTORY_MISSING_USER,
        HttpStatus.UNAUTHORIZED,
        "Missing user identifier",
      );
    }

    const entry = await this.historyService.create(userId, dto);
    return { success: true, payload: entry };
  }

  @Get()
  async list(
    @Request() req: AuthenticatedRequest,
    @Query("type") type?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    const items = await this.historyService.listForUser(req.user.id, {
      taskType: type,
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    });
    return { success: true, payload: items };
  }

  @Delete(":id")
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const removed = await this.historyService.deleteOne(req.user.id, id);
    if (!removed) {
      return { success: false, payload: { message: "Not found" } };
    }
    return { success: true, payload: removed };
  }
}
