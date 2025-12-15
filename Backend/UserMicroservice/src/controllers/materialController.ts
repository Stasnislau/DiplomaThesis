import { Controller, Request, Get, Post, Body, Param, NotFoundException } from "@nestjs/common";
import { MaterialService } from "../services/materialService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";
import { CreateUserMaterialDto } from "../dtos/createMaterial.dto";

@Controller("materials")
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createMaterialDto: CreateUserMaterialDto
  ) {
    const result = await this.materialService.create(req.user.id, createMaterialDto);
    return {
      success: true,
      payload: result,
    };
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const result = await this.materialService.findAllForUser(req.user.id);
    return {
      success: true,
      payload: result,
    };
  }

  @Get(":id")
  async findOne(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    const result = await this.materialService.findOne(id, req.user.id);
    if (!result) {
        throw new NotFoundException("Material not found");
    }
    return {
      success: true,
      payload: result,
    };
  }
}

