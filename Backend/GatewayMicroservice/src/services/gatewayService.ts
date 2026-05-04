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

/**
 * Tiny in-process token-bucket rate limiter for AI endpoints.
 *
 * Why bridge-only (instead of all routes): the user's API key is
 * billed per call there, so a runaway client (or accidental retry
 * loop) can drain real money in seconds. Auth/user routes are
 * cheap and self-contained — no need to gate them.
 *
 * 60 calls/hour/user is roughly one task generation per minute on
 * average — enough for normal study, far short of an abuse pattern.
 * For a multi-replica deploy this should move to Redis; with one
 * gateway replica it's adequate as-is.
 */
const AI_LIMIT_PER_HOUR = 60;
const AI_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const aiRateLimits = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(now: number): void {
  // Walk the map periodically and drop buckets whose window has
  // closed. Without this, every test user / one-shot caller leaves
  // a bucket sitting in memory until restart — over weeks the map
  // grows unboundedly. We piggyback on quota-check calls so we
  // don't need a separate timer.
  if (aiRateLimits.size < 1024) return; // amortise: only when it matters
  for (const [k, b] of aiRateLimits) {
    if (now - b.windowStart >= AI_LIMIT_WINDOW_MS) {
      aiRateLimits.delete(k);
    }
  }
}

function checkAndIncrementAiQuota(userId: string): {
  ok: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucket = aiRateLimits.get(userId);
  if (!bucket || now - bucket.windowStart >= AI_LIMIT_WINDOW_MS) {
    aiRateLimits.set(userId, { count: 1, windowStart: now });
    return {
      ok: true,
      remaining: AI_LIMIT_PER_HOUR - 1,
      resetMs: AI_LIMIT_WINDOW_MS,
    };
  }
  if (bucket.count >= AI_LIMIT_PER_HOUR) {
    return {
      ok: false,
      remaining: 0,
      resetMs: AI_LIMIT_WINDOW_MS - (now - bucket.windowStart),
    };
  }
  bucket.count += 1;
  return {
    ok: true,
    remaining: AI_LIMIT_PER_HOUR - bucket.count,
    resetMs: AI_LIMIT_WINDOW_MS - (now - bucket.windowStart),
  };
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  private readonly PUBLIC_ROUTES = [
    "api/auth/login",
    "api/auth/register",
    "api/auth/refresh",
    "api/languages",
    // Health probes need to be reachable without a JWT — Docker
    // healthchecks and any external uptime monitor never have one.
    "api/health",
  ];

  // Bridge subpaths that actually call out to an AI provider — these
  // are the ones we rate-limit. Other bridge paths (e.g. /health,
  // /ai-tokens/verify) are exempt.
  private readonly AI_BRIDGE_PREFIXES = [
    "writing/",
    "listening/",
    "speaking/",
    "placement/",
    "materials/upload",
    "materials/quiz",
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

      // After auth, before forwarding: gate AI-billing-bearing bridge
      // calls behind a per-user-per-hour quota.
      if (
        microservice === "bridge" &&
        userData &&
        this.AI_BRIDGE_PREFIXES.some((p) => path.startsWith(p))
      ) {
        const quota = checkAndIncrementAiQuota(userData.id);
        if (!quota.ok) {
          this.logger.warn(
            `Rate limit hit for user=${userData.id} on ${path}; resetMs=${quota.resetMs}`,
          );
          const resetSeconds = Math.ceil(quota.resetMs / 1000);
          return {
            status: 429,
            data: {
              success: false,
              payload: {
                message: `AI usage limit reached. Try again in ${Math.ceil(resetSeconds / 60)} minutes.`,
                retryAfterSeconds: resetSeconds,
                limit: AI_LIMIT_PER_HOUR,
                window: "1 hour",
              },
            },
          };
        }
      }

      this.logger.debug(`userData: ${userData?.id || "anonymous"}`);

      const contentType = headers["content-type"] || "";
      const isMultipart = contentType.includes("multipart/form-data");

      const dataToSend = isMultipart ? req : body;

      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method,
            url: targetUrl,
            headers: {
              ...headers,
              "x-internal-service-key": undefined,
              "content-length": undefined,
              ...(userData && {
                "X-User-Id": userData.id,
                "X-User-Email": userData.email,
                "X-User-Role": userData.role,
              }),
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
      const err = error as { message?: string; status?: number };
      this.logger.error(`Unhandled error in gatewayService: ${err.message}`);
      // Surface UnauthorizedException (and any other HttpException
      // with an explicit status) instead of pretending every problem
      // is a 500. Without this, an expired/missing JWT looks like a
      // server fault to the frontend.
      const status =
        err instanceof UnauthorizedException ? 401 : err.status ?? 500;
      return {
        status,
        data: {
          success: false,
          payload: {
            message: err.message ?? "Internal gateway error",
          },
        },
      };
    }
  }
}
