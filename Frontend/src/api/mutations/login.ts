import { AUTH_MICROSERVICE_URL } from "../consts";
import { z } from "zod";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiResponse } from "../parseApiResponse";

interface LoginResponse {
  accessToken: string;
  // refreshToken is set by Auth as an httpOnly cookie; the body no
  // longer carries it.
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

  return parseApiResponse<LoginResponse>(response, "Failed to login");
};
