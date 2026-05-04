import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Mark a controller / handler as requiring one of the supplied roles.
 * Pair with `RolesGuard` via `@UseGuards(RolesGuard)`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
