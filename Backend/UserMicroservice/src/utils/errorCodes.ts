/**
 * Stable, machine-readable codes for every HttpException User raises.
 *
 * Wire format: exception.message = "<CODE>: <english fallback>". The
 * ErrorHandlingMiddleware copies that into payload.message; the
 * frontend's parseApiError splits it back into { code, message } so
 * useLocalizedError can translate the prefix.
 *
 * Adding a new code:
 *   1. Add a constant below in the matching section.
 *   2. Add a translation key `errors.codes.<CODE>` in
 *      Frontend/src/config/i18n.ts under all locales.
 *   3. Use throwWithCode() at the call site.
 */
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

// User-domain codes ────────────────────────────────────────────────
export const USER_ID_REQUIRED = "USER_ID_REQUIRED";
export const USER_NOT_FOUND = "USER_NOT_FOUND";
export const USER_LANGUAGE_ID_MISSING = "USER_LANGUAGE_ID_MISSING";
export const USER_LANGUAGE_NOT_FOUND = "USER_LANGUAGE_NOT_FOUND";
export const USER_LANGUAGE_ALREADY_ADDED = "USER_LANGUAGE_ALREADY_ADDED";
export const USER_INVALID_LEVEL = "USER_INVALID_LEVEL";
export const USER_ID_AND_ROLE_REQUIRED = "USER_ID_AND_ROLE_REQUIRED";
export const USER_AI_TOKEN_CREATE_FAILED = "USER_AI_TOKEN_CREATE_FAILED";
export const USER_AI_TOKEN_NOT_FOUND = "USER_AI_TOKEN_NOT_FOUND";
export const USER_MATERIAL_NOT_FOUND = "USER_MATERIAL_NOT_FOUND";
export const USER_ACHIEVEMENT_NOT_FOUND = "USER_ACHIEVEMENT_NOT_FOUND";
export const USER_HISTORY_MISSING_USER = "USER_HISTORY_MISSING_USER";
export const USER_TOKEN_EXPIRED = "USER_TOKEN_EXPIRED";
export const USER_INVALID_TOKEN = "USER_INVALID_TOKEN";
export const USER_INTERNAL_ERROR = "USER_INTERNAL_ERROR";

function exceptionFor(status: number, message: string): HttpException {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedException(message);
    case HttpStatus.NOT_FOUND:
      return new NotFoundException(message);
    case HttpStatus.CONFLICT:
      return new ConflictException(message);
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return new InternalServerErrorException(message);
    case HttpStatus.BAD_REQUEST:
    default:
      return new BadRequestException(message);
  }
}

/**
 * Throw an HttpException whose message is `"<CODE>: <english fallback>"`.
 */
export function throwWithCode(
  code: string,
  status: number,
  message: string,
): never {
  throw exceptionFor(status, `${code}: ${message}`);
}
