import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { BadGatewayException, Controller } from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  async registeredOrganization(createOrganizationDto: CreateOrganizationDto) {
    const { orgName, orgEmail, email, password, role } = createOrganizationDto;

    try {
      const orgExists = await this.databaseService.organization.findUnique({
        where: {
          orgEmail,
        },
      });

      const userExists = await this.databaseService.authCredential.findUnique({
        where: {
          email,
        },
      });

      if (orgExists) {
        throw new BadGatewayException('Email already in use.');
      }

      if (userExists) {
        throw new BadGatewayException('User already exists.');
      }

      const org = await this.databaseService.organization.create({
        data: {
          orgEmail,
          orgName,
        },
      });

      const userDetails = {
        email,
        password,
        role,
      };
      const user = await this.authService.registerUserWithRole(
        org.id,
        userDetails,
      );

      return {
        Success: true,
        Message: 'Organziation has been registered successfully.',
        OrgDetails: org,
        UserDetails: user.UserDetails,
      };
    } catch (error) {
      return {
        Success: false,
        Message: 'Error registering organization.',
        Error: error,
      };
    }
  }
}
