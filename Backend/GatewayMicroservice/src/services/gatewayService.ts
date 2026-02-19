import {
  AUTH_MICROSERVICE_URL,
  AVAILABLE_MICROSERVICES,
  BRIDGE_MICROSERVICE_URL,
  USER_MICROSERVICE_URL,
} from "src/consts";
import { IncomingHttpHeaders, IncomingMessage } from "http";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import { AuthenticatedUser } from "src/types";
import { BaseResponse } from "src/types";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

/** Request body type - can be JSON object, string, or undefined */
type RequestBody = Record<string, unknown> | string | undefined;

/** Gateway response structure */
interface GatewayResponse {
  status: number;
  data: BaseResponse<unknown> | Record<string, unknown>;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  private readonly PUBLIC_ROUTES = [
    "api/auth/login",
    "api/auth/register",
    "api/auth/refresh",
    "api/languages",
  ];

  constructor(private readonly httpService: HttpService) {}

  private async validateToken(
    headers: IncomingHttpHeaders,
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
          },
        ),
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
    body: RequestBody,
    req: IncomingMessage,
  ): Promise<GatewayResponse> {
    this.logger.log(`Received request: ${method} ${url}`);
    try {
      let userData: AuthenticatedUser | undefined;

      const apiGatewayPattern = /^\/api\/gateway\/([a-zA-Z0-9_-]+)\/(.*)$/;
      const match = url.match(apiGatewayPattern);

      if (!match) {
        this.logger.warn(`Route pattern not matched for URL: ${url}`);
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

      this.logger.debug(
        `Parsed microservice: '${microservice}', path: '${path}'`,
      );

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
          this.logger.warn(`Unknown microservice requested: '${microservice}'`);
          return {
            status: 404,
            data: {
              success: false,
              payload: { message: `Microservice '${microservice}' not found` },
            },
          };
      }

      this.logger.debug(`Forwarding request to target URL: ${targetUrl}`);

      let shouldAuthenticate = true;
      this.PUBLIC_ROUTES.forEach((route) => {
        if (targetUrl.includes(route)) {
          shouldAuthenticate = false;
        }
      });

      this.logger.debug(`shouldAuthenticate: ${shouldAuthenticate}`);

      if (shouldAuthenticate) {
        userData = await this.validateToken(headers);
      }

      this.logger.debug(`userData: ${userData?.id || "anonymous"}`);

      // Check if request is multipart/form-data
      const contentType = headers["content-type"] || "";
      const isMultipart = contentType.includes("multipart/form-data");

      // If multipart, pass the request stream directly. Otherwise use the parsed body.
      const dataToSend = isMultipart ? req : body;

      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method,
            url: targetUrl,
            headers: {
              ...headers,
              // Sanitize internal headers
              "x-internal-service-key": undefined,
              ...(userData && {
                "X-User-Id": userData.id,
                "X-User-Email": userData.email,
                "X-User-Role": userData.role,
              }),
              // Ensure host header is not forwarded or is correct (axios handles it usually)
            },
            data: dataToSend,
            validateStatus: () => true,
            timeout: 200000,
            family: 4,
          }),
        );

        this.logger.log(
          `Response from ${microservice} microservice: Status ${response.status}`,
        );

        return {
          status: response.status,
          data: response.data as Record<string, unknown>,
        };
      } catch (error: unknown) {
        const axiosError = error as {
          message?: string;
          response?: { status: number; data: unknown };
          request?: unknown;
        };

        this.logger.error(
          `Error forwarding request to ${targetUrl}: ${axiosError.message}`,
        );

        if (axiosError.response) {
          return {
            status: axiosError.response.status,
            data: axiosError.response.data as Record<string, unknown>,
          };
        } else if (axiosError.request) {
          this.logger.error(
            `Service unavailable or no response from ${targetUrl}`,
          );
          return {
            status: 503,
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
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(`Unhandled error in gatewayService: ${err.message}`);
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
