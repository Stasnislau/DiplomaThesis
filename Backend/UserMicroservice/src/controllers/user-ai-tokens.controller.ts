import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Delete,
  Param,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { UserAITokensService } from "../services/user-ai-tokens.service";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { CreateUserAITokenDto } from "../dtos/createUserAIToken.dto";

@Controller("ai-tokens")
export class UserAITokensController {
  constructor(private readonly userAITokensService: UserAITokensService) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createUserAITokenDto: CreateUserAITokenDto
  ) {
    const result = await this.userAITokensService.create(
      req.user.id,
      createUserAITokenDto
    );
    if (result === null) {
      throw new BadRequestException("Failed to create AI token");
    }
    return {
      success: true,
      payload: result,
    };
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const result = await this.userAITokensService.findAllForUser(req.user.id);
    return {
      success: true,
      payload: result,
    };
  }

  @Delete(":id")
  async remove(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    const result = await this.userAITokensService.remove(id, req.user.id);
    if (result === null) {
      throw new NotFoundException(`Token with ID #${id} not found`);
    }
    return {
      success: true,
      payload: result,
    };
  }
}
