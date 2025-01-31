import { HttpService } from "@nestjs/axios";
import { Controller, All, Req, Res, BadGatewayException } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { AUTH_MICROSERVICE_URL, BRIDGE_MICROSERVICE_URL } from "src/consts";
import { Request, Response } from "express";
import { AVAILABLE_MICROSERVICES } from "src/consts";

@Controller("gateway")
export class GatewayController {
  constructor(private httpService: HttpService) {}

  @All("*")
  async handleAuthRequests(@Req() req: Request, @Res() res: Response) {
    console.log("=== GATEWAY DEBUG START ===");
    const { method, url, headers, body } = req;
    console.log("🚀 Incoming request:");
    console.log("URL:", url);
    console.log("Method:", method);
    console.log("Body:", body);
    console.log("Headers:", headers);

    let targetUrl = "";
    const microservice = url.split("/")[3];
    const pathArray = url.split("/");
    const path = pathArray.slice(4).join("/");
    switch (microservice) {
      case "auth":
        targetUrl = `${AUTH_MICROSERVICE_URL}/api/${path}`;
        console.log("AUTH", targetUrl);
        break;
      case "bridge":
        targetUrl = `${BRIDGE_MICROSERVICE_URL}/api/${path}`;
        console.log("🎯 Forwarding to BRIDGE:", targetUrl);
        break;
      default:
        throw new BadGatewayException("Invalid url");
    }
    console.log(targetUrl);

    try {
      console.log("📤 Sending request to microservice:");
      console.log("Target URL:", targetUrl);
      console.log("Method:", method);
      console.log("Body being sent:", body);
      
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: targetUrl,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Host': '127.0.0.1:3003',
          },
          data: body,
          validateStatus: () => true,
          timeout: 5000,
          family: 4,
          lookup: (hostname, options, callback) => {
            callback(null, '127.0.0.1', 4);
          }
        })
      );
      
      console.log("📥 Received response:", response.data);
      console.log("=== GATEWAY DEBUG END ===");
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error("💥 GATEWAY ERROR:");
      console.error("Error details:", error);
      console.error("Request that failed:", {
        url: targetUrl,
        method,
        body,
      });
      console.log("=== GATEWAY DEBUG END ===");
      throw new BadGatewayException(error);
    }
  }
}
