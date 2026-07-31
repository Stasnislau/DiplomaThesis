import { PlacementTestController } from "./placementTestController";
import { PlacementTestService } from "../services/placementTestService";

describe("PlacementTestController", () => {
  it("delegates completion to the placement service with the caller id", async () => {
    const placementTestService = {
      saveResult: jest.fn().mockResolvedValue({ level: "B1" }),
    };
    const controller = new PlacementTestController(
      placementTestService as unknown as PlacementTestService,
    );

    const result = await controller.completeTest(
      { user: { id: "u1" } } as any,
      {
        languageId: "en",
        level: "B1",
        score: 72,
        feedback: { strengths: [] },
      },
    );

    expect(placementTestService.saveResult).toHaveBeenCalledWith({
      userId: "u1",
      languageId: "en",
      level: "B1",
      score: 72,
      feedback: { strengths: [] },
    });
    expect(result).toEqual({ success: true, payload: { level: "B1" } });
  });
});
