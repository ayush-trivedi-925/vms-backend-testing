import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterSystemUserDto } from '../dto/register-system-user.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../service/mail/mail.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { EditSystemUserDto } from '../dto/edit-system-user.dto';
import { decrypt } from '../utils/encryption.util';
const otpGenerator = require('otp-generator');
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}
  async registerSystemUser(
    orgId,
    userId,
    role,
    registerSystemUserDto: RegisterSystemUserDto,
  ) {
    const { email, password, secretCode } = registerSystemUserDto;
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

    if (userExists.orgId !== orgId) {
      throw new UnauthorizedException('Unauthenticated addition attempt.');
    }

    const systemAccountCount =
      await this.databaseService.systemCredential.count({
        where: { orgId },
      });

    if (
      organizationExists.accountLimit !== null &&
      systemAccountCount >= organizationExists.accountLimit
    ) {
      throw new BadRequestException(
        'Maximum number of system account limit have been exceeded.',
      );
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
        secretCode,
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

    if (systemAccountExists.activityStatus === 'LoggedIn') {
      throw new UnauthorizedException(
        'User already logged in on another device. Please log out first.',
      );
    }

    const sessionId = crypto.randomUUID();

    const accessToken = await this.jwtService.sign(
      {
        systemId: systemAccountExists.id,
        orgId: systemAccountExists.orgId,
        role: systemAccountExists.role,
        sessionId,
      },
      {
        expiresIn: '7d',
      },
    );
    const refreshToken = crypto.randomUUID();
    await this.databaseService.refreshToken.create({
      data: {
        token: refreshToken,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        systemId: systemAccountExists.id,
      },
    });

    await this.databaseService.systemCredential.update({
      where: {
        id: systemAccountExists.id,
      },
      data: {
        activityStatus: 'LoggedIn',
        sessionId,
      },
    });
    return {
      success: true,
      message: 'Login successfull.',
      accessToken,
      refreshToken,
    };
  }

  async editSystemAccount(
    orgId,
    role,
    systemId,
    editSystemUserDto: EditSystemUserDto,
  ) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin can update system account details!',
      );
    }

    const { secretCode } = editSystemUserDto;

    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );
    if (!systemExists) {
      throw new NotFoundException('Invalid systemId');
    }

    if (systemExists?.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized update attempt');
    }

    await this.databaseService.systemCredential.update({
      where: {
        id: systemExists.id,
      },
      data: {
        secretCode,
      },
    });

    return {
      success: true,
      message: 'System details updated successfully!',
    };
  }

  async fetchSystemDetails(orgId, role, systemId) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Unauthorized fetch attempt.');
    }

    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );

    if (!systemExists) {
      throw new NotFoundException('Invalid system credentials.');
    }
    if (systemExists.orgId !== orgId) {
      throw new UnauthorizedException(
        'Unauthorized fetch attempt. Mismatch in orgId.',
      );
    }

    return {
      success: true,
      secretCode: systemExists.secretCode,
    };
  }

  async fetchSystemActivityStatus(orgId, role, systemId) {
    if (!orgId || !role || !systemId) {
      throw new BadRequestException('Invalid token!');
    }

    const allowedRoles = ['System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Unauthorized fetch attempt.');
    }

    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );

    if (!systemExists) {
      throw new NotFoundException('Invalid system credentials.');
    }
    if (systemExists.orgId !== orgId) {
      throw new UnauthorizedException(
        'nauthorized fetch attempt. Mismatch in orgId.',
      );
    }

    return {
      success: true,
      activityStatus: systemExists.activityStatus,
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
          secretCode: true,
          activityStatus: true,
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

  async verifySecretCode(
    orgId: string,
    role: string,
    systemId: string,
    secretCode: string,
  ) {
    // Role check
    if (role !== 'System') {
      throw new UnauthorizedException('Unauthorized');
    }

    // Check system exists
    const system = await this.databaseService.systemCredential.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      throw new NotFoundException('Invalid system ID');
    }

    // Organization match check
    if (system.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized');
    }

    // Secret code check
    if (system.secretCode !== secretCode) {
      throw new UnauthorizedException('Incorrect secret code');
    }

    return { success: true };
  }

  async deleteSystemAccount(systemId, orgId, userId, role) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Only superadmin can delete system accounts.',
      );
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

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Provide a valid email address.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const system = await this.databaseService.systemCredential.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true,
      },
    });

    if (!system) {
      throw new NotFoundException('No account found with this email.');
    }

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const hashedOtp = await bcrypt.hash(otp, 10);

    // Use upsert to avoid unique constraint errors
    await this.databaseService.resetTokenSystem.upsert({
      where: { systemId: system!.id },
      update: {
        token: hashedOtp,
      },
      create: {
        systemId: system!.id,
        token: hashedOtp,
      },
    });

    await this.mailService.sendForgotPasswordOTPSystem({
      email: normalizedEmail,
      otp,
      organizationName: system?.organization.name,
    });

    return {
      success: true,
      message: 'Password reset OTP sent successfully. Please check your email.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword, email } = resetPasswordDto;

    const normalizedEmail = email.toLowerCase().trim();

    const system = await this.databaseService.systemCredential.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (!system) {
      throw new NotFoundException('No system account found with this email.');
    }

    // Finding if token exists

    const tokenExists = await this.databaseService.resetTokenSystem.findFirst({
      where: {
        systemId: system.id,
      },
    });

    if (!tokenExists) {
      throw new BadRequestException('Token doesnt exists.');
    }

    const verifyOtp = await bcrypt.compare(resetToken, tokenExists?.token);

    if (!verifyOtp) {
      throw new BadRequestException('Invalid OTP!');
    }

    // Reseting the password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Updating the password
    await this.databaseService.systemCredential.update({
      where: {
        id: system.id,
      },
      data: {
        password: hashedNewPassword,
      },
    });

    // Deleting the reset token
    await this.databaseService.resetTokenSystem.delete({
      where: {
        id: tokenExists.id,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async logoutSystemAccount(orgId, systemId, role) {
    const allowedRoles = ['System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Access denied based on role.');
    }

    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new BadRequestException('Invalid organization.');
    }
    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );

    if (!systemExists) {
      throw new BadRequestException('Invalid system credentials.');
    }

    if (systemExists.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized attempt');
    }

    if (systemExists.activityStatus !== 'LoggedIn') {
      throw new BadRequestException('User not loggedIn.');
    }

    await this.databaseService.systemCredential.update({
      where: {
        id: systemId,
      },
      data: {
        activityStatus: 'LoggedOut',
        sessionId: null,
      },
    });

    await this.databaseService.refreshToken.deleteMany({
      where: {
        systemId: systemId,
      },
    });
    return {
      success: true,
      message: 'Logout successfull.',
    };
  }

  async logoutSystemAccountWeb(systemId, orgId, userId, role) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Only superadmin can logout system account.',
      );
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

    if (userExists.orgId !== orgId) {
      throw new BadRequestException('Invalid credentials.');
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

    if (sytemAccountExists.activityStatus === 'LoggedOut') {
      throw new BadRequestException('Account is already logged out.');
    }

    await this.databaseService.systemCredential.update({
      where: {
        id: systemId,
      },
      data: {
        activityStatus: 'LoggedOut',
        sessionId: null,
      },
    });

    return {
      success: true,
      message: 'System account logged out successfully.',
    };
  }

  async logoutAllSystemAccounts(orgId, role, userId) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Unauthorized update attempt.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException('Invalid organization.');
    }

    const userExists = await this.databaseService.userCredential.findUnique({
      where: {
        id: userId,
      },
    });

    if (!userExists) {
      throw new NotFoundException('Invalid user credentials.');
    }

    if (userExists.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized update attempt.');
    }

    const activeSystemAccounts =
      await this.databaseService.systemCredential.findMany({
        where: {
          orgId,
          activityStatus: 'LoggedIn',
        },
      });

    if (activeSystemAccounts.length === 0) {
      throw new NotFoundException('All accounts are logged out');
    }

    await this.databaseService.refreshToken.deleteMany({
      where: {
        systemId: {
          in: activeSystemAccounts.map((x) => x.id),
        },
      },
    });

    await this.databaseService.systemCredential.updateMany({
      where: {
        orgId,
        activityStatus: 'LoggedIn',
      },
      data: {
        activityStatus: 'LoggedOut',
        sessionId: null,
      },
    });

    return {
      success: true,
      message: 'All logged in accounts have been logged out.',
    };
  }

  async verifySettingsCode(
    orgId: string,
    role: string,
    systemId: string,
    secretCode: string,
  ) {
    // Role check
    if (role !== 'System') {
      throw new UnauthorizedException('Unauthorized');
    }

    // Check system exists
    const system = await this.databaseService.systemCredential.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      throw new NotFoundException('Invalid system ID');
    }

    const organizationExist =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExist) {
      throw new BadRequestException('Invalid organization.');
    }

    // Organization match check
    if (system.orgId !== orgId) {
      throw new BadRequestException('Unauthorized');
    }
    let settingsCode;

    if (organizationExist?.settingCodeEncrypted) {
      const encryptionKey = this.config.get<string>('ENCRYPTION_KEY'); // or whatever key name you use
      if (!encryptionKey) {
        throw new InternalServerErrorException(
          'ENCRYPTION_KEY is not set in environment variables',
        );
      }
      settingsCode = decrypt(
        organizationExist?.settingCodeEncrypted,
        encryptionKey,
      );
    } else {
      settingsCode = null;
    }

    if (secretCode !== settingsCode) {
      throw new BadRequestException('Secret code mismatch.');
    }

    return { success: true };
  }
}
