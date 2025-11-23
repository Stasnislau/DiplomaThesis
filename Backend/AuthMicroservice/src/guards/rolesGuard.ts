import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<
      (Role | "ALL" | "CHECK_USER_IN_SERVICE")[]
    >("roles", context.getHandler());

    if (!roles || roles.includes("ALL")) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const hasRole = roles.some((role) => role === user.role);
    if (hasRole) {
      return true;
    }

    if (roles.includes("CHECK_USER_IN_SERVICE")) {
      return true;
    }

    return false;
  }
}
