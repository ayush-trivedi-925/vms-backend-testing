import { BadGatewayException, Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import * as bcrypt from 'bcrypt';
import { OrganizationService } from './organization.service';
import { LoginOrganizationDto } from 'src/dto/login-organization.dto';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @Post('sign-up')
  async registerOrg(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.registeredOrganization(
      createOrganizationDto,
    );
  }

  @Post('sign-in')
  async loginOrg(@Body() loginOrganizationDto: LoginOrganizationDto) {
    return this.organizationService.loginOrganization(loginOrganizationDto);
  }
}
