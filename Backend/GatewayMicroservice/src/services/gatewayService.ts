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
    body: any
  ): Promise<any> {
    try {
      let userData: AuthenticatedUser | undefined;
      const microservice = url.split("/")[3] as (typeof AVAILABLE_MICROSERVICES)[number];
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
          targetUrl = `${USER_MICROSERVICE_URL}/api/${path}`;
          break;
        default:
          this.exhaustiveCheck(microservice);
      }
      console.log(targetUrl);
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
      ).catch(error => {
        if (error.response) {
          return {
            status: error.response.status,
            data: error.response.data
          };
        } else if (error.request) {
          return {
            status: 503,
            data: {
              success: false,
              payload: {
                message: "Service unavailable"
              }
            }
          };
        } else {
          return {
            status: 500,
            data: {
              success: false,
              payload: {
                message: "Internal gateway error"
              }
            }
          };
        }
      });

      return {
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error('Gateway error:', error);
      return {
        status: 500,
        data: {
          success: false,
          payload: {
            message: "Internal gateway error"
          }
        }
      };
    }
  }
}
