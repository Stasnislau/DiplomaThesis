import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RolesGuard } from "./rolesGuard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, "getAllAndOverride">>;

  const ctx = (role?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : {} }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it("allows when no roles are required", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctx("USER"))).toBe(true);
  });

  it("allows an empty required list", () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(ctx("USER"))).toBe(true);
  });

  it("allows a matching role", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(guard.canActivate(ctx("ADMIN"))).toBe(true);
  });

  it("rejects a missing role claim", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(() => guard.canActivate(ctx())).toThrow(ForbiddenException);
  });

  it("rejects a non-matching role", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    expect(() => guard.canActivate(ctx("USER"))).toThrow(ForbiddenException);
  });
});
