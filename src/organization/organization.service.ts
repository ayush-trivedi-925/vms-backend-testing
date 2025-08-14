import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { BadGatewayException, Controller } from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationService {
  constructor(private readonly databaseService: DatabaseService) {}
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
}
