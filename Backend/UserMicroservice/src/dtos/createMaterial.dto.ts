import { IsArray, IsNotEmpty, IsString } from "class-validator";

interface AnalyzedMaterialType {
  type: string;
  count?: number;
  details?: string;
}

export class CreateUserMaterialDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsNotEmpty()
  @IsArray()
  analyzedTypes: AnalyzedMaterialType[] | string[];
}
