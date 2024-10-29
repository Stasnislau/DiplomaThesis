import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import {
  CustomException,
  InternalServerErrorException,
} from "../exceptions/customException";

@Catch()
export class ErrorHandlingMiddleware implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof CustomException) {
      this.handleError(exception, host);
    } else {
      console.log(
        "Error in error handling middleware:",
        exception.message,
        exception.stack
      );
      this.handleError(new InternalServerErrorException(), host);
    }
  }

  handleError = (exception: Error, host: ArgumentsHost) => {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      payload: {
        message: message,
        timestamp: new Date().toISOString(),
      },
    });
  };
}
