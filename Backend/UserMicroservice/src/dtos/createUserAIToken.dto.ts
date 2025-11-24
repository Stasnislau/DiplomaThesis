import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserAITokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  aiProviderId: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
