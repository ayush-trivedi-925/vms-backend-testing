import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';

import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { RegisterRootDto } from 'src/dto/register-root.dto';
import { MailService } from 'src/service/mail/mail.service';
import { ResetPasswordDto } from 'src/dto/reset-password.dto';
const otpGenerator = require('otp-generator');

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async registerRootUser(registeRootDto: RegisterRootDto) {
    const { email, password } = registeRootDto;
    const normalizedEmail = email.toLowerCase().trim();

    const rootAlreadyExists =
      await this.databaseService.userCredential.findFirst({
        where: {
          role: 'Root',
        },
      });

    if (rootAlreadyExists) {
      throw new BadRequestException('Root user already exists.');
    }

    const emailInUse = await this.databaseService.userCredential.findUnique({
      where: {
        email: normalizedEmail,
      },
    });
    if (emailInUse) {
      throw new BadRequestException('Email currently in use.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const onlyRootUser = await this.databaseService.userCredential.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: 'Root',
        firstTimeLogin: false,
      },
    });

    return {
      success: true,
      message: 'Root user has been created.',
      rootDetails: {
        email: onlyRootUser.email,
        role: onlyRootUser.role,
        createdAt: onlyRootUser.createdAt,
      },
    };
  }

  // async registerUserWithRole(registerUserWithRoleDto: RegisterUserWithRoleDto) {
  //   const { email, password, role, orgId } = registerUserWithRoleDto;

  //   const userExists = await this.databaseService.userCredential.findUnique({
  //     where: {
  //       email,
  //     },
  //   });
  //   if (userExists) {
  //     throw new BadRequestException('User exists already.');
  //   }
  //   const hashedPassword = await bcrypt.hash(password, 10);

  //   const user = await this.databaseService.userCredential.create({
  //     data: {
  //       email,
  //       password: hashedPassword,
  //       role,
  //       orgId,
  //     },
  //   });

  //   return {
  //     Success: true,
  //     Message: 'User has been registered successfully.',
  //     UserDetails: user,
  //   };
  // }

  async loginUser(email: string, password: string, newPassword?: string) {
    let user = await this.databaseService.userCredential.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("User doesn't exist.");
    }

    // First-time login flow
    if (user.firstTimeLogin) {
      const verifyPassword = await bcrypt.compare(password, user.password);
      if (!verifyPassword) {
        throw new BadRequestException('Invalid credentials.');
      }

      if (!newPassword) {
        return {
          success: false,
          firstTimeLogin: true,
          message: 'First time login. Please provide new password.',
        };
      }

      // Change password & mark as not first time
      await this.changePassword(user.id, newPassword);

      await this.databaseService.userCredential.update({
        where: { id: user.id },
        data: { firstTimeLogin: false },
      });

      // re-fetch updated user
      user = await this.databaseService.userCredential.findUnique({
        where: { id: user.id },
      });

      if (!user) {
        throw new NotFoundException("User doesn't exist");
      }

      if (user.accountStatus === 'Disabled' || user.role === 'Staff') {
        throw new UnauthorizedException(
          "You don't have permission to access dashboard",
        );
      }

      // double-check new password hash
      const verifyNewPassword = await bcrypt.compare(
        newPassword,
        user.password,
      );
      if (!verifyNewPassword) {
        throw new BadRequestException('Password update failed.');
      }
    } else {
      if (user.accountStatus === 'Disabled' || user.role === 'Staff') {
        throw new UnauthorizedException(
          "You don't have permission to access dashboard",
        );
      }
      // Normal login flow
      const verifyPassword = await bcrypt.compare(password, user.password);
      if (!verifyPassword) {
        throw new BadRequestException('Invalid credentials.');
      }
    }

    const accessToken = this.jwtService.sign({
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
    });

    const refreshToken = uuid();
    await this.databaseService.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      role: user.role,
    };
  }

  async changePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.databaseService.userCredential.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenExistsDB = await this.databaseService.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

    if (!tokenExistsDB) {
      throw new BadRequestException('Invalid refresh token.');
    }

    if (tokenExistsDB.expiryDate < new Date()) {
      throw new BadRequestException('Refresh token expired.');
    }

    if (!tokenExistsDB.userId) {
      throw new BadRequestException('User ID must exist.');
    }

    const userExists = await this.databaseService.userCredential.findUnique({
      where: {
        id: tokenExistsDB.userId,
      },
    });

    if (!userExists) {
      throw new BadRequestException('User not found.');
    }

    const accessToken = this.jwtService.sign({
      orgId: userExists.orgId,
      userId: userExists.id,
      role: userExists.role,
    });

    const newRefreshToken = uuid();

    await this.databaseService.refreshToken.update({
      where: {
        id: tokenExistsDB.id,
      },
      data: {
        token: newRefreshToken,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'Token refreshed.',
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    };
  }
  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Provide a valid email address.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.databaseService.userCredential.findUnique({
      where: { email: normalizedEmail },
      include: { staff: true },
    });

    if (!user || user.accountStatus !== 'Active') {
      throw new NotFoundException('No active user found with this email.');
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
    await this.databaseService.resetToken.upsert({
      where: { userId: user.id },
      update: {
        token: hashedOtp,
      },
      create: {
        userId: user.id,
        token: hashedOtp,
      },
    });

    await this.mailService.sendForgotPasswordOTP({
      email: normalizedEmail,
      otp,
      name: user.staff?.name || 'User',
    });

    return {
      success: true,
      message: 'Password reset OTP sent successfully. Please check your email.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword, email } = resetPasswordDto;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.databaseService.userCredential.findUnique({
      where: { email: normalizedEmail },
      include: { staff: true },
    });

    if (!user || user.accountStatus !== 'Active') {
      throw new NotFoundException('No active user found with this email.');
    }

    // Finding if token exists

    const tokenExists = await this.databaseService.resetToken.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!tokenExists) {
      throw new BadRequestException('Token doesnt exists.');
    }

    const verifyOtp = await bcrypt.compare(resetToken, tokenExists?.token);

    if (!verifyOtp) {
      throw new BadRequestException('Invalid token!');
    }

    // Reseting the password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Updating the password
    await this.databaseService.userCredential.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedNewPassword,
      },
    });

    // Deleting the reset token
    await this.databaseService.resetToken.delete({
      where: {
        id: tokenExists.id,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
