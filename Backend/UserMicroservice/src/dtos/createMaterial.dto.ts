import { IsArray, IsNotEmpty, IsString } from "class-validator";

/** Structure for analyzed material type */
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
