import { Injectable, UnauthorizedException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { IncomingHttpHeaders } from "http";
import { firstValueFrom } from "rxjs";
import { BaseResponse } from "src/types";
import {
  AUTH_MICROSERVICE_URL,
  AVAILABLE_MICROSERVICES,
  BRIDGE_MICROSERVICE_URL,
  USER_MICROSERVICE_URL,
} from "src/consts";
import { AuthenticatedUser } from "src/types";

@Injectable()
export class GatewayService {
  private readonly PUBLIC_ROUTES = [
    "api/auth/login",
    "api/auth/register",
    "api/auth/refresh",
  ];

  constructor(private readonly httpService: HttpService) {}

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

  private exhaustiveCheck = (microservice: never): never => {
    throw new Error(`Invalid microservice: ${microservice}`);
  };

  async handleRequest(
    method: string,
    url: string,
    headers: IncomingHttpHeaders,
    body: any,
    req: any
  ): Promise<any> {
    console.log(`[Gateway] Received request: ${method} ${url}`);
    try {
      let userData: AuthenticatedUser | undefined;

      const apiGatewayPattern = /^\/api\/gateway\/([a-zA-Z0-9_-]+)\/(.*)$/;
      const match = url.match(apiGatewayPattern);

      if (!match) {
        console.error(`[Gateway] Route pattern not matched for URL: ${url}`);
        return {
          status: 404,
          data: {
            success: false,
            payload: { message: `Route not found on gateway: ${url}` },
          },
        };
      }

      const [, microservice, path] = match;
      let targetUrl = "";

      console.log(`[Gateway] Parsed microservice: '${microservice}', path: '${path}'`);

      switch (microservice) {
        case "auth":
          targetUrl = `${AUTH_MICROSERVICE_URL}/api/${path}`;
          break;
        case "bridge":
          targetUrl = `${BRIDGE_MICROSERVICE_URL}/api/${path}`;
          break;
        case "user":
          targetUrl = `${USER_MICROSERVICE_URL}/api/${path}`;
          break;
        default:
          console.error(`[Gateway] Unknown microservice requested: '${microservice}'`);
          return {
            status: 404,
            data: {
              success: false,
              payload: { message: `Microservice '${microservice}' not found` },
            },
          };
      }

      console.log(`[Gateway] Forwarding request to target URL: ${targetUrl}`);

      let shouldAuthenticate = true;
      this.PUBLIC_ROUTES.forEach((route) => {
        if (targetUrl.includes(route)) {
          shouldAuthenticate = false;
        }
      });

      console.log(shouldAuthenticate, "shouldAuthenticate");

      if (shouldAuthenticate) {
        userData = await this.validateToken(headers);
      }

      console.log(userData, "userData");

      // Check if request is multipart/form-data
      const contentType = headers['content-type'] || '';
      const isMultipart = contentType.includes('multipart/form-data');
      
      // If multipart, pass the request stream directly. Otherwise use the parsed body.
      const dataToSend = isMultipart ? req : body;

      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method,
            url: targetUrl,
            headers: {
              ...headers,
              ...(userData && {
                "X-User-Id": userData.id,
                "X-User-Email": userData.email,
                "X-User-Role": userData.role,
              }),
              // Ensure host header is not forwarded or is correct (axios handles it usually)
            },
            data: dataToSend,
            validateStatus: () => true,
            timeout: 50000,
            family: 4,
          }),
        );

        console.log(`[Gateway] Response from ${microservice} microservice: Status ${response.status}`);

        return {
          status: response.status,
          data: response.data,
        };
      } catch (error) {
        console.error(`[Gateway] Error forwarding request to ${targetUrl}:`, error.message);
        if (error.response) {
          return {
            status: error.response.status,
            data: error.response.data,
          };
        } else if (error.request) {
          console.error(`[Gateway] Service unavailable or no response from ${targetUrl}`);
          return {
            status: 503, // Service Unavailable
            data: {
              success: false,
              payload: {
                message: `Service '${microservice}' unavailable. No response.`,
              },
            },
          };
        } else {
          return {
            status: 500,
            data: {
              success: false,
              payload: {
                message: "Internal gateway error during request forwarding",
              },
            },
          };
        }
      }
    } catch (error) {
      console.error(`[Gateway] Unhandled error in gatewayService:`, error.message);
      return {
        status: 500,
        data: {
          success: false,
          payload: {
            message: "Internal gateway error",
          },
        },
      };
    }
  }
}
