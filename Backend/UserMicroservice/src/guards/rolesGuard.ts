import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "./roles.decorator";

/**
 * Reads roles set via `@Roles("ADMIN", ...)` and rejects any request
 * whose `req.user.role` (populated by UserDataMiddleware from the
 * gateway-forwarded `x-user-role` header) isn't on the list.
 *
 * Without this guard, any authenticated user could call admin-only
 * endpoints — that's how the `/users` listing was exposing every
 * account's PII to anyone holding a valid JWT.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: string | undefined = request.user?.role;
    if (!role) {
      throw new ForbiddenException("FORBIDDEN_ROLE: Missing role claim");
    }
    if (!required.includes(role)) {
      throw new ForbiddenException(
        `FORBIDDEN_ROLE: Role '${role}' is not permitted for this resource`,
      );
    }
    return true;
  }
}
