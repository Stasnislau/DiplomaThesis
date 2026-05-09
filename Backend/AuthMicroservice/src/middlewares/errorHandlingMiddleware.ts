import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { Response } from "express";
import {
  AUTH_INTERNAL_ERROR,
  AUTH_INVALID_TOKEN,
  AUTH_TOKEN_EXPIRED,
} from "../utils/errorCodes";

/** Error response payload structure */
interface ErrorPayload {
  code?: string;
  message: string;
  timestamp: string;
  errors?: unknown;
}

/** Standard error response structure */
interface ErrorResponseBody {
  success: false;
  payload: ErrorPayload;
}

/** Extract { code, message } from an HttpException's response. The new
 *  contract puts a structured `{ code, message }` body on the
 *  exception; older code paths may pass a raw string. We support both
 *  so a stray legacy throw doesn't crash the response shape. */
function extractCodeAndMessage(
  exception: HttpException,
): { code?: string; message: string } {
  const response = exception.getResponse();
  if (typeof response === "object" && response !== null) {
    const obj = response as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : undefined;
    const inner = obj.message;
    let message: string;
    if (typeof inner === "string") {
      message = inner;
    } else if (Array.isArray(inner)) {
      // class-validator returns an array of validation strings.
      message = inner.join("; ");
    } else {
      message = exception.message;
    }
    return { code, message };
  }
  return { message: exception.message };
}

@Catch()
export class ErrorHandlingMiddleware implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof TokenExpiredError) {
      this.handleError(
        new UnauthorizedException({
          code: AUTH_TOKEN_EXPIRED,
          message: "Token has expired",
        }),
        host,
      );
      return;
    }

    if (exception instanceof JsonWebTokenError) {
      this.handleError(
        new UnauthorizedException({
          code: AUTH_INVALID_TOKEN,
          message: "Invalid token",
        }),
        host,
      );
      return;
    }

    if (exception instanceof HttpException) {
      this.handleError(exception, host);
    } else {
      this.handleError(
        new InternalServerErrorException({
          code: AUTH_INTERNAL_ERROR,
          message: exception.message || "Internal server error",
        }),
        host,
      );
    }
  }

  handleError = (exception: HttpException, host: ArgumentsHost) => {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const { code, message } = extractCodeAndMessage(exception);
    const responseBody: ErrorResponseBody = {
      success: false,
      payload: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };

    if (exception instanceof BadRequestException) {
      const validationErrors = exception.getResponse();
      if (typeof validationErrors === "object" && validationErrors !== null) {
        const errors = validationErrors as Record<string, unknown>;
        // class-validator's structured response carries the array
        // under `message`; only surface it when it's actually a list.
        const inner = errors["message"];
        if (Array.isArray(inner)) {
          responseBody.payload.errors = inner;
        }
      }
    }

    response.status(status).json(responseBody);
  };
}
