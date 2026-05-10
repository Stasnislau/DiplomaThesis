import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Language, User } from "@prisma/client";

import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { BaseResponse } from "src/types/BaseResponse";
import { EventPattern } from "@nestjs/microservices";
import { UserService } from "../services/userService";
import { MailerService } from "../services/mailerService";
import { Roles } from "../guards/roles.decorator";
import { RolesGuard } from "../guards/rolesGuard";

@Controller("")
export class UserController {
  constructor(
    private userService: UserService,
    private mailerService: MailerService,
  ) {}

  @Get("languages")
  async getLanguages(): Promise<BaseResponse<Language[]>> {
    return this.userService.getLanguages();
  }

  @Post("addUserLanguage")
  async addUserLanguage(
    @Body() { languageId, level }: { languageId: string; level: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<BaseResponse<boolean>> {
    return this.userService.addUserLanguage(req.user.id, languageId, level);
  }

  @Get("me")
  async getUser(
    @Request() req: AuthenticatedRequest,
  ): Promise<BaseResponse<User>> {
    return this.userService.getUser(req.user.id, {
      email: req.user.email,
      role: req.user.role,
    });
  }

  /**
   * Record XP earned and advance the daily streak counter.
   * Internal-only — callers must supply the shared service key in
   * x-internal-service-key. Without this guard any authenticated user
   * could award themselves unlimited XP by just POSTing here.
   */
  @Post("me/activity")
  async recordActivity(
    @Request() req: AuthenticatedRequest,
    @Body() body: { xpGained: number },
  ): Promise<BaseResponse<{ xp: number; streak: number }>> {
    const internalKey = req.headers["x-internal-service-key"] as
      | string
      | undefined;
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected || internalKey !== expected) {
      throw new ForbiddenException(
        "FORBIDDEN_INTERNAL: This endpoint is internal-only.",
      );
    }
    const result = await this.userService.updateActivity(
      req.user.id,
      body.xpGained ?? 0,
    );
    return { success: true, payload: result };
  }

  // ADMIN-only — exposes every account's email/name/createdAt. Without
  // the guard, any authenticated USER could list all PII of every user
  // on the platform.
  @Get("users")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async getUsers(): Promise<BaseResponse<User[]>> {
    return this.userService.getUsers();
  }

  @Post("setNativeLanguage")
  async setNativeLanguage(
    @Body() { languageId }: { languageId: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<BaseResponse<boolean>> {
    return this.userService.setNativeLanguage(req.user.id, languageId);
  }

  @Put("updateUser")
  async updateUser(
    @Body()
    { name, surname, email }: { name: string; surname: string; email?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<BaseResponse<boolean>> {
    const result = await this.userService.updateUser({
      id: req.user.id,
      name,
      surname,
      email,
    });
    return {
      success: true,
      payload: result,
    };
  }

  @EventPattern("user.created")
  async handleUserCreated(userData: {
    id: string;
    email: string;
    name: string;
    surname: string;
    role: string;
    createdAt: Date;
  }) {
    await this.userService.createUser(userData);
  }

  @EventPattern("user.updatedRole")
  async handleUserUpdatedRole(userData: { id: string; role: string }) {
    await this.userService.updateUserRole(userData);
  }

  @EventPattern("user.deleted")
  async handleUserDeleted(userData: { id: string }) {
    await this.userService.deleteUser(userData);
  }

  @EventPattern("password.reset")
  async handlePasswordReset(payload: {
    id: string;
    email: string;
    newPassword: string;
  }) {
    const locale = await this.userService.getUserLocale(payload.id);
    await this.mailerService.sendPasswordReset(
      payload.email,
      payload.newPassword,
      locale,
    );
  }
}
