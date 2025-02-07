import { HttpService } from "@nestjs/axios";
import {
  Controller,
  All,
  Req,
  Res,
  BadGatewayException,
  UnauthorizedException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import {
  AUTH_MICROSERVICE_URL,
  BRIDGE_MICROSERVICE_URL,
  USER_MICROSERVICE_URL,
} from "src/consts";
import { Request, Response } from "express";
import { AVAILABLE_MICROSERVICES } from "src/consts";
import { AuthenticatedUser, BaseResponse } from "../types";
import { IncomingHttpHeaders } from "http";

@Controller("gateway")
export class GatewayController {
  constructor(private httpService: HttpService) {}

  private readonly PUBLIC_ROUTES = [
    "/gateway/auth/login",
    "/gateway/auth/register",
    "/gateway/auth/refresh",
  ];

  private async validateToken(
    headers: IncomingHttpHeaders
  ): Promise<AuthenticatedUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${AUTH_MICROSERVICE_URL}/api/auth/validate`,
          {},
          {
            headers: {
              Authorization: headers.authorization,
            },
          }
        )
      );
      const data = response.data as BaseResponse<AuthenticatedUser>;
      return data.payload;

    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  exhaustiveCheck = (microservice: never): never => {
    throw new Error(`Invalid microservice: ${microservice}`);
  };

  @All("*")
  async handleAuthRequests(@Req() req: Request, @Res() res: Response) {
    const { method, url, headers, body } = req;

    let userData: AuthenticatedUser | undefined;
    const microservice = url.split(
      "/"
    )[3] as (typeof AVAILABLE_MICROSERVICES)[number];

    if (microservice !== "auth") {
      if (!headers.authorization) {
        throw new UnauthorizedException("No token provided");
      }
      userData = await this.validateToken(headers);
    }

    let targetUrl = "";
    const pathArray = url.split("/");
    const path = pathArray.slice(4).join("/");
    switch (microservice) {
      case "auth":
        targetUrl = `${AUTH_MICROSERVICE_URL}/api/${path}`;
        break;
      case "bridge":
        targetUrl = `${BRIDGE_MICROSERVICE_URL}/api/${path}`;
        break;
      case "user":
        console.log(path, "path");
        targetUrl = `${USER_MICROSERVICE_URL}/api/${path}`;
        console.log(targetUrl, "targetUrl");
        break;
      default:
        this.exhaustiveCheck(microservice);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: targetUrl,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            ...(userData && {
              "X-User-Id": userData.id,
              "X-User-Email": userData.email,
              "X-User-Role": userData.role,
            }),
            Host: "127.0.0.1:3003",
          },
          data: body,
          validateStatus: () => true,
          timeout: 5000,
          family: 4,
          lookup: (hostname, options, callback) => {
            callback(null, "127.0.0.1", 4);
          },
        })
      );

      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error("Request that failed:", {
        url: targetUrl,
        method,
        body,
      });
      throw new BadGatewayException(error);
    }
  }
}
