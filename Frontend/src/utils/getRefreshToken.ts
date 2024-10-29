import Cookies from "js-cookie";

export const getRefreshToken = () => {
  return Cookies.get("refreshToken");
};
