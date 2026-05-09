/**
 * Stable, machine-readable codes for every HttpException Auth raises.
 *
 * Wire contract (since the structured-error refactor):
 *   - throwWithCode() raises an HttpException whose response body is
 *     `{ code, message }`.
 *   - ErrorHandlingMiddleware reads both fields and emits
 *     `payload.code` AND `payload.message` as siblings — code is no
 *     longer embedded inside the message string.
 *   - Frontend `parseApiResponse` reads `payload.code` directly. It
 *     still falls back to parsing a "<CODE>: <msg>" message prefix
 *     for backward compatibility with any uncaught path.
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

// Auth-domain codes ────────────────────────────────────────────────
export const AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS";
export const AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN";
export const AUTH_REFRESH_TOKEN_REQUIRED = "AUTH_REFRESH_TOKEN_REQUIRED";
export const AUTH_REFRESH_TOKEN_INVALID = "AUTH_REFRESH_TOKEN_INVALID";
export const AUTH_REFRESH_TOKEN_EXPIRED = "AUTH_REFRESH_TOKEN_EXPIRED";
export const AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND";
export const AUTH_INVALID_OLD_PASSWORD = "AUTH_INVALID_OLD_PASSWORD";
export const AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED";
export const AUTH_INVALID_TOKEN = "AUTH_INVALID_TOKEN";
export const AUTH_AUTHORIZATION_FAILED = "AUTH_AUTHORIZATION_FAILED";
export const AUTH_INTERNAL_ERROR = "AUTH_INTERNAL_ERROR";
export const AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED";

/**
 * Pick the right NestJS exception class for a given HTTP status. Each
 * exception gets a structured response body `{ code, message }` so
 * the middleware can emit them as separate fields on the wire.
 *
 * BadRequestException stays special-cased because the
 * ErrorHandlingMiddleware uses it to surface validation `errors`
 * arrays from class-validator.
 */
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

/**
 * Throw an HttpException whose response body is `{ code, message }`.
 * The middleware turns that into `payload: { code, message, timestamp }`
 * so clients never need to parse a magic string.
 */
export function throwWithCode(
  code: string,
  status: number,
  message: string,
): never {
  throw exceptionFor(status, code, message);
}
