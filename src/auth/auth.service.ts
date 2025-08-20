import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { RegisterUserWithRoleDto } from 'src/dto/register-user-with-role';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async upsertRefreshToken(refreshToken: string, authId: string) {
    await this.databaseService.refreshToken.upsert({
      where: {
        authId,
      },
      update: {
        token: refreshToken,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      create: {
        token: refreshToken,
        authId,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  }

  async registerUserWithRole(registerUserWithRoleDto: RegisterUserWithRoleDto) {
    const { email, password, role, orgId } = registerUserWithRoleDto;

    const userExists = await this.databaseService.authCredential.findUnique({
      where: {
        email,
      },
    });
    if (userExists) {
      throw new BadRequestException('User exists already.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.databaseService.authCredential.create({
      data: {
        email,
        password: hashedPassword,
        role,
        orgId,
      },
    });

    return {
      Success: true,
      Message: 'User has been registered successfully.',
      UserDetails: user,
    };
  }

  async loginUser(email: string, password: string) {
    const userExists = await this.databaseService.authCredential.findUnique({
      where: {
        email,
      },
    });

    if (!userExists) {
      throw new NotFoundException("User doesn't exists.");
    }

    const verifyPassword = await bcrypt.compare(password, userExists.password);

    if (!verifyPassword) {
      throw new BadRequestException('Invalid credentials.');
    }

    const accessToken = await this.jwtService.sign({
      userId: userExists.id,
      orgId: userExists.orgId,
      role: userExists.role,
    });

    const refreshToken = uuid();

    await this.upsertRefreshToken(refreshToken, userExists.id);
    return {
      Success: true,
      Message: 'User logged in.',
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    };
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

    const userExists = await this.databaseService.authCredential.findUnique({
      where: {
        id: tokenExistsDB.authId,
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
        authId: userExists.id,
      },
      data: {
        token: newRefreshToken,
      },
    });

    return {
      Success: true,
      Message: 'Token refreshed.',
      AccessToken: accessToken,
      RefreshToken: newRefreshToken,
    };
  }
}
