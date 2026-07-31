import { HealthController } from "./healthController";

describe("HealthController", () => {
  it("returns a plain ok payload for the liveness probe", () => {
    expect(new HealthController().health()).toEqual({
      status: "ok",
      service: "user",
    });
  });
});
