import { API_URL } from "../consts";
import { BaseResponse } from "../../types/responses/BaseResponse";
import { getAccessToken } from "../../utils/getAccessToken";
import { getRefreshToken } from "@/utils/getRefreshToken";

export const logout = async () => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = (await response.json()) as BaseResponse<string>;

  if (!data.success) {
    throw new Error((data.payload as unknown as string) || "Failed to logout");
  }

  return data.payload;
};
