import { AUTH_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { extractApiError } from "../extractApiError";
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
    throw new Error(extractApiError(data, "Failed to register"));
  }

  return data.payload;
};
