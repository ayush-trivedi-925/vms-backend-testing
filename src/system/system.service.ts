import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterSystemUserDto } from 'src/dto/register-system-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}
  async registerSystemUser(
    orgId,
    userId,
    role,
    registerSystemUserDto: RegisterSystemUserDto,
  ) {
    const { email, password } = registerSystemUserDto;
    const allowedRoles = ['SuperAdmin'];
    const normalizedEmail = email.toLowerCase().trim();
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException('Only superadmin can add system accounts.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new BadRequestException("Organization doesn't exists.");
    }

    const userExists = await this.databaseService.userCredential.findUnique({
      where: {
        id: userId,
      },
    });
    if (!userExists) {
      throw new BadRequestException("User doesn't exists.");
    }

    const systemAccountExists =
      await this.databaseService.systemCredential.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (systemAccountExists) {
      throw new BadRequestException('System account already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const systemUser = await this.databaseService.systemCredential.create({
      data: {
        orgId,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
    return {
      success: true,
      message: 'System account has been registered successfully.',
      systemAccountDetails: {
        orgId: systemUser.orgId,
        email: systemUser.email,
      },
    };
  }

  async loginSystemUser(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const systemAccountExists =
      await this.databaseService.systemCredential.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (!systemAccountExists) {
      throw new NotFoundException("System user doesn't exists.");
    }
    const verifyPassword = await bcrypt.compare(
      password,
      systemAccountExists.password,
    );
    if (!verifyPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const accessToken = await this.jwtService.sign({
      systemId: systemAccountExists.id,
      orgId: systemAccountExists.orgId,
      role: systemAccountExists.role,
    });
    const refreshToken = crypto.randomUUID();
    await this.databaseService.refreshToken.create({
      data: {
        token: refreshToken,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        systemId: systemAccountExists.id,
      },
    });
    return {
      success: true,
      message: 'Login successfull.',
      accessToken,
      refreshToken,
    };
  }
  async refreshSystemAccessToken(token: string) {
    const tokenExists = await this.databaseService.refreshToken.findUnique({
      where: {
        token,
        expiryDate: {
          gte: new Date(),
        },
      },
      include: {
        systemCredentials: true,
      },
    });

    if (!tokenExists) {
      throw new NotFoundException("Refresh token doesn't exists.");
    }

    const accessToken = await this.jwtService.sign({
      systemId: tokenExists.systemCredentials?.id,
      orgId: tokenExists.systemCredentials?.orgId,
      role: tokenExists.systemCredentials?.role,
    });

    // Update refresh token
    const newRefreshToken = crypto.randomUUID();
    await this.databaseService.refreshToken.update({
      where: { id: tokenExists.id },
      data: {
        token: newRefreshToken,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      success: true,
      message: 'New access token issued.',
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getAllSytemUser(orgId: string, role: string) {
    const allowedRoles = ['SuperAdmin'];
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });
    if (!organizationExists) {
      throw new NotFoundException('Organization not found');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin can view all system users in the organization.',
      );
    }
    const systemAccounts = await this.databaseService.systemCredential.findMany(
      {
        where: {
          orgId,
        },
        select: {
          id: true,
          email: true,
        },
      },
    );
    if (systemAccounts.length === 0) {
      return {
        success: true,
        message:
          'There are currently no system accounts for this organization. Add to access system view on mobile application.',
        numberOfSystemAccounts: 0,
        systemAccounts: [],
      };
    }

    return {
      success: true,
      numberOfSystemAccounts: systemAccounts.length,
      systemAccounts,
    };
  }

  async deleteSystemAccount(systemId, orgId, userId, role) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException('Only superadmin can add system accounts.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new BadRequestException("Organization doesn't exists.");
    }

    const userExists = await this.databaseService.userCredential.findUnique({
      where: {
        id: userId,
      },
    });
    if (!userExists) {
      throw new BadRequestException("User doesn't exists.");
    }

    const sytemAccountExists =
      await this.databaseService.systemCredential.findUnique({
        where: {
          id: systemId,
        },
      });

    if (!sytemAccountExists) {
      throw new NotFoundException('System account does not exists.');
    }

    await this.databaseService.systemCredential.delete({
      where: {
        id: systemId,
      },
    });

    return {
      success: true,
      message: 'System account deleted successfully.',
    };
  }
}
