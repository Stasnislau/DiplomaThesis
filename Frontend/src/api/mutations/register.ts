import { API_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { User } from "../../types/models/User";
import { userSchema } from "../../types/models/User";
import { z } from "zod";

export const registerUserDtoSchema = userSchema
  .pick({ email: true, name: true, surname: true })
  .extend({
    password: z.string(),
  });

export type RegisterUserRequest = z.infer<typeof registerUserDtoSchema>;

export const register = async (input: RegisterUserRequest) => {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as BaseResponse<User>;

  return data;
};
