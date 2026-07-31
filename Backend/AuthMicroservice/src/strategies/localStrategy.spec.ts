import { HttpException } from "@nestjs/common";

import { AuthService } from "../services/authService";
import { LocalStrategy } from "./localStrategy";

describe("LocalStrategy", () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<Pick<AuthService, "validateUser">>;

  beforeEach(() => {
    authService = { validateUser: jest.fn() };
    strategy = new LocalStrategy(authService as unknown as AuthService);
  });

  it("returns the user when credentials validate", async () => {
    const user = { id: "u1", email: "a@b.com", role: "USER" };
    authService.validateUser.mockResolvedValue(user as any);

    await expect(strategy.validate("a@b.com", "secret")).resolves.toEqual(user);
    expect(authService.validateUser).toHaveBeenCalledWith("a@b.com", "secret");
  });

  it("throws AUTH_INVALID_CREDENTIALS when validation fails", async () => {
    authService.validateUser.mockResolvedValue(null);

    let caught: unknown;
    try {
      await strategy.validate("a@b.com", "bad");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(HttpException);
    const body = (caught as HttpException).getResponse() as Record<
      string,
      unknown
    >;
    expect(body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });
});
