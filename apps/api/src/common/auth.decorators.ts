import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { UserRole } from '@edalat/shared';

export interface RequestUser {
  id: string;
  phone: string;
  role: UserRole;
}

export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Like `JwtAuthGuard`, but never blocks the request: on a missing, invalid
 * or expired token it just leaves `request.user` unset instead of 401ing.
 *
 * For endpoints that must stay open to guests (PRD §88 — a lead should never
 * be a dead end behind a login) but should still record the owner when the
 * submitter happens to be logged in, e.g. `ManufacturingController.create`
 * and `ProductRequestsController.create`.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = RequestUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}

export const ROLES_KEY = 'roles';

/** PRD §51 — role-based access control on admin and staff endpoints. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    return !!user && required.includes(user.role);
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined =>
    ctx.switchToHttp().getRequest<{ user?: RequestUser }>().user,
);
