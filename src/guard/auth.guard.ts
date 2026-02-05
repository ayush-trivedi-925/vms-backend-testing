import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { TokenExpiredError } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

interface JwtPayload {
  orgId: string;
  userId?: string;
  role: string;
  systemId?: string;
  sessionId?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Invalid token!');
    }
    try {
      const decode = this.jwtService.verify(token) as JwtPayload;

      if (decode.systemId) {
        const systemUser =
          await this.databaseService.systemCredential.findUnique({
            where: { id: decode.systemId },
          });

        if (!systemUser) {
          throw new UnauthorizedException('System user not found');
        }

        if (systemUser.activityStatus !== 'LoggedIn') {
          throw new UnauthorizedException('User is logged out.');
        }

        if (
          !systemUser.sessionId ||
          !decode.sessionId ||
          systemUser.sessionId !== decode.sessionId
        ) {
          throw new UnauthorizedException(
            'Session is no longer valid. Please log in again.',
          );
        }

        (request as any).systemId = decode.systemId;
        (request as any).sessionId = decode.sessionId;
      }
      if (decode.userId) {
        (request as any).userId = decode.userId;
      }

      (request as any).orgId = decode.orgId;
      (request as any).role = decode.role;
      if (!decode.systemId && !decode.userId) {
        throw new UnauthorizedException('Invalid token payload!');
      }

      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired!');
      }
      Logger.error(error.message);
      throw new UnauthorizedException('Invalid token!');
    }
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    return request.headers.authorization?.split(' ')[1];
  }
}
