import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { Response } from "express";
import {
  USER_INTERNAL_ERROR,
  USER_INVALID_TOKEN,
  USER_TOKEN_EXPIRED,
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

/** Pull { code, message } out of an HttpException — supports both the
 *  new structured `{ code, message }` body and the legacy plain-string
 *  message so a stray throw doesn't break the response shape. */
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
  private readonly logger = new Logger(ErrorHandlingMiddleware.name);

  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof TokenExpiredError) {
      this.handleError(
        new UnauthorizedException({
          code: USER_TOKEN_EXPIRED,
          message: "Token has expired",
        }),
        host,
      );
      return;
    }

    if (exception instanceof JsonWebTokenError) {
      this.handleError(
        new UnauthorizedException({
          code: USER_INVALID_TOKEN,
          message: "Invalid token",
        }),
        host,
      );
      return;
    }

    if (exception instanceof HttpException) {
      this.handleError(exception, host);
    } else {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
      this.handleError(
        new InternalServerErrorException({
          code: USER_INTERNAL_ERROR,
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
        const inner = errors["message"];
        if (Array.isArray(inner)) {
          responseBody.payload.errors = inner;
        }
      }
    }

    response.status(status).json(responseBody);
  };
}
