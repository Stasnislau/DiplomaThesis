import { ConfigService } from "@nestjs/config";

import { JwtStrategy } from "./jwtStrategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let config: jest.Mocked<Pick<ConfigService, "get">>;

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue("test-secret") };
    strategy = new JwtStrategy(config as unknown as ConfigService);
  });

  it("maps JWT payload fields onto the validated user", async () => {
    const user = await strategy.validate({
      sub: "user-1",
      email: "a@b.com",
      role: "USER",
      iat: 1,
      exp: 2,
    });

    expect(user).toEqual({ id: "user-1", email: "a@b.com", role: "USER" });
  });

  it("reads the JWT secret from config at construction", () => {
    expect(config.get).toHaveBeenCalledWith("jwt.secret");
  });
});
