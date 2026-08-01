import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

export const AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS";
export const AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN";
export const AUTH_REFRESH_TOKEN_REQUIRED = "AUTH_REFRESH_TOKEN_REQUIRED";
export const AUTH_EMAIL_REQUIRED = "AUTH_EMAIL_REQUIRED";
export const AUTH_REFRESH_TOKEN_INVALID = "AUTH_REFRESH_TOKEN_INVALID";
export const AUTH_REFRESH_TOKEN_EXPIRED = "AUTH_REFRESH_TOKEN_EXPIRED";
export const AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND";
export const AUTH_INVALID_OLD_PASSWORD = "AUTH_INVALID_OLD_PASSWORD";
export const AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED";
export const AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN";
export const AUTH_AUTHORIZATION_FAILED = "AUTH_AUTHORIZATION_FAILED";
export const AUTH_INTERNAL_ERROR = "AUTH_INTERNAL_ERROR";
export const AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED";

function exceptionFor(
  status: number,
  code: string,
  message: string,
): HttpException {
  const body = { code, message };
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedException(body);
    case HttpStatus.NOT_FOUND:
      return new NotFoundException(body);
    case HttpStatus.CONFLICT:
      return new ConflictException(body);
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return new InternalServerErrorException(body);
    case HttpStatus.TOO_MANY_REQUESTS:
      return new HttpException(body, HttpStatus.TOO_MANY_REQUESTS);
    case HttpStatus.BAD_REQUEST:
    default:
      return new BadRequestException(body);
  }
}

export function throwWithCode(
  code: string,
  status: number,
  message: string,
): never {
  throw exceptionFor(status, code, message);
}
