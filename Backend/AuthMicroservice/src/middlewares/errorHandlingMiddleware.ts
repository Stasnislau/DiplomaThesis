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
  message: string;
  timestamp: string;
  errors?: unknown;
}

/** Standard error response structure */
interface ErrorResponseBody {
  success: false;
  payload: ErrorPayload;
}

@Catch()
export class ErrorHandlingMiddleware implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof TokenExpiredError) {
      this.handleError(
        new UnauthorizedException(`${AUTH_TOKEN_EXPIRED}: Token has expired`),
        host,
      );
      return;
    }

    if (exception instanceof JsonWebTokenError) {
      this.handleError(
        new UnauthorizedException(`${AUTH_INVALID_TOKEN}: Invalid token`),
        host,
      );
      return;
    }

    if (exception instanceof HttpException) {
      this.handleError(exception, host);
    } else {
      this.handleError(
        new InternalServerErrorException(
          `${AUTH_INTERNAL_ERROR}: ${exception.message || "Internal server error"}`,
        ),
        host,
      );
    }
  }

  handleError = (exception: HttpException, host: ArgumentsHost) => {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const responseBody: ErrorResponseBody = {
      success: false,
      payload: {
        message: exception.message,
        timestamp: new Date().toISOString(),
      },
    };

    if (exception instanceof BadRequestException) {
      const validationErrors = exception.getResponse();
      if (typeof validationErrors === "object" && validationErrors !== null) {
        const errors = validationErrors as Record<string, unknown>;
        responseBody.payload.errors = errors["message"] || validationErrors;
      }
    }

    response.status(status).json(responseBody);
  };
}
