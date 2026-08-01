import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecordUserErrorDto {
  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @IsString()
  @IsNotEmpty()
  errorText: string;

  @IsString()
  @IsNotEmpty()
  correction: string;

  @IsString()
  @IsNotEmpty()
  errorType: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsOptional()
  context?: string;
}
