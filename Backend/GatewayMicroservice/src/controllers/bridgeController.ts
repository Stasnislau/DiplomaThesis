import { HttpService } from "@nestjs/axios";
import {
  Controller,
  Logger,
  All,
  Req,
  Res,
  BadGatewayException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { Request, Response } from "express";

@Controller("bridge")
export class BridgeController {
  constructor(private httpService: HttpService) {}
  private readonly logger = new Logger(BridgeController.name);

  private readonly bridgeUrl = "http://127.0.0.1:3003";

  @All("*")
  async handleBridgeRequests(@Req() req: Request, @Res() res: Response) {
    const { method, url, headers, body } = req;
    const targetUrl = `${this.bridgeUrl}${url.replace("/bridge", "")}`;
    console.log(targetUrl);
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: targetUrl,
          headers,
          data: body,
          validateStatus: () => true,
        })
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      throw new BadGatewayException(error);
    }
  }
}
