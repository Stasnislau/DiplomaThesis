import { AUTH_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { fetchWithAuth } from "../fetchWithAuth";
import { userSchema } from "../../types/models/User";
import { z } from "zod";

export const registerUserDtoSchema = userSchema
  .pick({ email: true, name: true, surname: true })
  .extend({
    password: z.string(),
  });

export type RegisterUserRequest = z.infer<typeof registerUserDtoSchema>;

export const register = async (input: RegisterUserRequest) => {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/register`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  const data = (await response.json()) as BaseResponse<boolean>;

  if (!data.success) {
    const errorMsg =
      (data.payload as any)?.message ||
      data.errors?.join(", ") ||
      "Failed to register";
    throw new Error(errorMsg);
  }

  return data.payload;
};
