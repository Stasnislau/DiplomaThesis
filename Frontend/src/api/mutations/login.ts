import { AUTH_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { z } from "zod";
import { fetchWithAuth } from "../fetchWithAuth";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  message?: string;
  errors?: string[];
}

export const loginUserDtoSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginUserRequest = z.infer<typeof loginUserDtoSchema>;

export const login = async (input: LoginUserRequest) => {
  const response = await fetchWithAuth(
    `${AUTH_MICROSERVICE_URL}/auth/login`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  const data = (await response.json()) as BaseResponse<LoginResponse>;
  if (!data.success) {
    throw new Error(data?.payload?.message || "Failed to login");
  }

  return data;
};
