import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from "@nestjs/common";
import { UserService } from "../services/userService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { EventPattern } from "@nestjs/microservices";
import { BaseResponse } from "src/types/BaseResponse";
import { User } from "@prisma/client";

@Controller("")
export class UserController {
  constructor(private userService: UserService) {}

  @Get("languages")
  async getLanguages() {
    return this.userService.getLanguages();
  }

  @Get("me")
  async getUser(@Request() req: AuthenticatedRequest) : Promise<BaseResponse<User>> {
    return this.userService.getUser(req.user.id);
  }

  @EventPattern("user.created")
  async handleUserCreated(userData: {
    id: string;
    email: string;
    name: string;
    surname: string;
    role: string;
  }) {
    console.log("User created event received", userData);
    await this.userService.createUser(userData);
  }
}
