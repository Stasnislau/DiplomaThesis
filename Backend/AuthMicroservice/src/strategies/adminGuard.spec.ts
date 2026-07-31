import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AdminGuard } from "./adminGuard";

describe("AdminGuard", () => {
  let guard: AdminGuard;
  let reflector: jest.Mocked<Pick<Reflector, "get">>;

  const makeContext = (role?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
      getHandler: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new AdminGuard(reflector as unknown as Reflector);
  });

  it("allows the request when no roles metadata is set", () => {
    reflector.get.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext("USER"))).toBe(true);
  });

  it("allows when the user role is in the required list", () => {
    reflector.get.mockReturnValue(["ADMIN"]);
    expect(guard.canActivate(makeContext("ADMIN"))).toBe(true);
  });

  it("rejects when the user role is missing from the required list", () => {
    reflector.get.mockReturnValue(["ADMIN"]);
    expect(guard.canActivate(makeContext("USER"))).toBe(false);
  });
});
