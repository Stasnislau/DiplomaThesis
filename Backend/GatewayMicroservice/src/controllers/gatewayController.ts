import { Controller, All, Req, Res, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { GatewayService } from "../services/gatewayService";

@Controller("gateway")
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private gatewayService: GatewayService) {}

  @All("*")
  async handleAuthRequests(@Req() req: Request, @Res() res: Response) {
    try {
      const { method, url, headers, body } = req;
      const response = await this.gatewayService.handleRequest(
        method,
        url,
        headers,
        body,
        req,
      );
      // Forward Set-Cookie from upstream verbatim — Auth's httpOnly
      // refresh cookie depends on this round-trip.
      if (response.setCookie && response.setCookie.length > 0) {
        res.setHeader("Set-Cookie", response.setCookie);
      }
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error("Gateway controller error:", error);
      return res.status(500).json({
        success: false,
        payload: {
          message: "Gateway error",
        },
      });
    }
  }
}
