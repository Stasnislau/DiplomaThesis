import { IsNotEmpty, IsString, IsArray, IsJSON } from 'class-validator';

export class CreateUserMaterialDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsNotEmpty()
  analyzedTypes: any; // Can be JSON or array of objects
}

