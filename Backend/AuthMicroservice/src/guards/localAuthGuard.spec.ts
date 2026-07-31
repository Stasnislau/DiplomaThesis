import { LocalAuthGuard } from "./localAuthGuard";

describe("LocalAuthGuard", () => {
  it("is an AuthGuard bound to the local strategy", () => {
    const guard = new LocalAuthGuard();
    expect(guard).toBeInstanceOf(LocalAuthGuard);
  });
});
