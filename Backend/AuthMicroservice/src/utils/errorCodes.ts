/**
 * Stable, machine-readable codes for every HttpException Auth raises.
 *
 * Same contract as Bridge's error_codes.py and Frontend's parseApiError:
 * the exception's `message` is `"<CODE>: <english explanation>"`. The
 * ErrorHandlingMiddleware copies that string into `payload.message`,
 * the gateway forwards it as-is, and `parseApiError` on the frontend
 * splits it into `{ code, message }` for `useLocalizedError`.
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

/**
 * Pick the right NestJS exception class for a given HTTP status so the
 * existing ErrorHandlingMiddleware keeps recognising kinds (it special-
 * cases BadRequestException for the validation `errors` array).
 */
function exceptionFor(
  status: number,
  message: string,
): HttpException {
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
 * The prefix is the wire contract, the message is for developer logs +
 * unmapped-code fallbacks on the frontend.
 */
export function throwWithCode(
  code: string,
  status: number,
  message: string,
): never {
  throw exceptionFor(status, `${code}: ${message}`);
}
