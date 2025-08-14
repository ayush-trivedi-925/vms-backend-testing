import { BadGatewayException, Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import * as bcrypt from 'bcrypt';
import { OrganizationService } from './organization.service';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @Post('sign-up')
  async registerOrg(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.registeredOrganization(
      createOrganizationDto,
    );
  }
}
