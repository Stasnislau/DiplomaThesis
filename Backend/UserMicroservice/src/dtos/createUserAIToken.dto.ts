import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserAITokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  model: string;
}
