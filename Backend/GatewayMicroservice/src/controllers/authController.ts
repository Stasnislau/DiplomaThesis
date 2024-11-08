import { HttpService } from "@nestjs/axios";
import {
  Controller,
  All,
  Req,
  Res,
  BadGatewayException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { AUTH_MICROSERVICE_URL } from "src/consts";
import { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(private httpService: HttpService) {}

  @All("*")
  async handleAuthRequests(@Req() req: Request, @Res() res: Response) {
    const { method, url, headers, body } = req;
    const targetUrl = `${AUTH_MICROSERVICE_URL}${url}`;
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
