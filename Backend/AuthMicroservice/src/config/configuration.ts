export default  () => ({
  port: process.env.PORT || 3001,
  jwt: {
    secret: process.env.JWT_SECRET || "MYSECRET",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || "MYSUPERSECRET",
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },
});
