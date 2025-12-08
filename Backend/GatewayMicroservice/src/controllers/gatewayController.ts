import { Controller, All, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { GatewayService } from "../services/gatewayService";

@Controller("gateway")
export class GatewayController {
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
        req
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error("Gateway controller error:", error);
      return res.status(500).json({
        success: false,
        payload: {
          message: "Gateway error"
        }
      });
    }
  }
}
