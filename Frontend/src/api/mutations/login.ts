import { API_URL } from "../consts";
import { getAccessToken } from "../../utils/getAccessToken";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { z } from "zod";

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
  const accessToken = getAccessToken();
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as BaseResponse<LoginResponse>;

  return data;
};
