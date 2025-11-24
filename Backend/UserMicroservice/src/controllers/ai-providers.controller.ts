import { Controller, Get } from '@nestjs/common';
import { AiProvidersService } from '../services/ai-providers.service';

@Controller('ai-providers')
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get()
  async findAll() {
    const result = await this.aiProvidersService.findAll();
    return {
      success: true,
      payload: result,
    };
  }
}

