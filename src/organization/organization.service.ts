import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { BadGatewayException, Controller } from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import * as bcrypt from 'bcrypt';
import { LoginOrganizationDto } from 'src/dto/login-organization.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async upsertRefreshToken(refreshToken: string, orgId: string) {
    await this.databaseService.refreshToken.upsert({
      where: {
        orgId,
      },
      update: {
        token: refreshToken,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      create: {
        token: refreshToken,
        orgId,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  }
  async registeredOrganization(createOrganizationDto: CreateOrganizationDto) {
    const { orgName, orgEmail, password } = createOrganizationDto;

    try {
      const orgExists = await this.databaseService.organization.findUnique({
        where: {
          orgEmail,
        },
      });
      if (orgExists) {
        throw new BadGatewayException('Email already in use.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const org = await this.databaseService.organization.create({
        data: {
          orgEmail,
          orgName,
          password: hashedPassword,
        },
      });

      return {
        Success: true,
        Message: 'Organziation has been registered successfully.',
        OrgDetails: org,
      };
    } catch (error) {
      return {
        Success: false,
        Message: 'Error registering organization.',
        Error: error,
      };
    }
  }

  async loginOrganization(loginOrganizationDto: LoginOrganizationDto) {
    const { email, password } = loginOrganizationDto;
    if (!email || !password) {
      throw new BadRequestException('Provide valid email and password.');
    }

    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        orgEmail: email,
      },
    });
    if (!orgExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }
    const verifyPassword = await bcrypt.compare(password, orgExists.password);

    if (!verifyPassword) {
      throw new BadRequestException('Invalid credentails!');
    }

    const accessToken = this.jwtService.sign({
      orgId: orgExists.id,
    });

    const refreshToken = uuid();

    await this.upsertRefreshToken(refreshToken, orgExists.id);

    return {
      Success: true,
      Message: 'User logged in.',
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    };
  }
}
