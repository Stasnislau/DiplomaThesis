import {
  Controller,
  Request,
  Get,
  Post,
  Body,
} from "@nestjs/common";
import { UserService } from "../services/userService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { EventPattern } from "@nestjs/microservices";
import { BaseResponse } from "src/types/BaseResponse";
import { Language, User } from "@prisma/client";


@Controller("")
export class UserController {
  constructor(private userService: UserService) {}

  @Get("languages")
  async getLanguages() {
    return this.userService.getLanguages();
  }

  @Post("addLanguage")
  async addLanguage(@Body() languageId: string, @Request() req: AuthenticatedRequest  ) {
    return this.userService.addLanguage(req.user.id, languageId);
  }

    
  @Get("me")
  async getUser(
    @Request() req: AuthenticatedRequest
  ): Promise<BaseResponse<User>> {
    return this.userService.getUser(req.user.id);
  }

  @Get("users")
  async getUsers(): Promise<BaseResponse<User[]>> {
    return this.userService.getUsers();
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
    console.log("User created event received", userData);
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
}
