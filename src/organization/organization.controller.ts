import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
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
