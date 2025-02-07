import { IsString, IsUUID } from "class-validator";

export class UserRequest {
  @IsString()
  @IsUUID()
  id: string;
}
