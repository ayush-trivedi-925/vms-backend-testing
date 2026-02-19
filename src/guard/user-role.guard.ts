import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { AuthRoleEnum } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { REQUIRED_ROLE_KEY } from '../decorators/required-role.decorator';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<string>(
      REQUIRED_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRole) {
      return true; // no role required
    }
    const request = context.switchToHttp().getRequest();
    const userId = request.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.databaseService.userCredential.findFirst({
      where: {
        id: userId,
        role: requiredRole as AuthRoleEnum,
      },
    });

    if (!user) {
      throw new ForbiddenException(
        `User doesn't have required role: ${requiredRole}`,
      );
    }
    return true;
  }
}
