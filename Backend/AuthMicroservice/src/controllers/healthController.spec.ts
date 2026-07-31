import { HealthController } from "./healthController";

describe("HealthController", () => {
  it("returns a plain ok payload for the liveness probe", () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: "ok", service: "auth" });
  });
});
