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
    const payloadErrors = (data.payload as any)?.errors as string[] | undefined;
    const payloadMessage = (data.payload as any)?.message as string | undefined;
    const errorMsg =
      payloadErrors?.join("\n") ||
      payloadMessage ||
      data.errors?.join("\n") ||
      "Failed to register";
    throw new Error(errorMsg);
  }

  return data.payload;
};
