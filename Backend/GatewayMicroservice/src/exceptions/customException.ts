import { HttpException, HttpStatus } from "@nestjs/common";

export class CustomException extends HttpException {
  constructor(message: string, statusCode: HttpStatus) {
    super(message, statusCode);
  }
}

export class NotFoundException extends CustomException {
  constructor(message: string = "Not Found") {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class BadRequestException extends CustomException {
  constructor(message: string = "Bad Request") {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedException extends CustomException {
  constructor(message: string = "Unauthorized") {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends CustomException {
  constructor(message: string = "Forbidden") {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class InternalServerErrorException extends CustomException {
  constructor(message: string = "Internal Server Error") {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
