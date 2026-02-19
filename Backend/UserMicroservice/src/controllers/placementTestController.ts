import { Controller, Post, Body, Request } from "@nestjs/common";
import { PlacementTestService } from "../services/placementTestService";
import { AuthenticatedRequest } from "src/types/AuthenticatedRequest";

@Controller("placement-test")
export class PlacementTestController {
  constructor(private readonly placementTestService: PlacementTestService) {}

  @Post("complete")
  async completeTest(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      languageId: string;
      level: string;
      score: number;
      feedback: any;
    },
  ) {
    const result = await this.placementTestService.saveResult({
      userId: req.user.id,
      languageId: body.languageId,
      level: body.level,
      score: body.score,
      feedback: body.feedback,
    });

    return {
      success: true,
      payload: result,
    };
  }
}
