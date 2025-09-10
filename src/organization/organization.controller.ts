import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import { OrganizationService } from './organization.service';
import { AuthGuard } from 'src/guard/auth.guard';
import { EditOrganizationDto } from 'src/dto/edit-organization.dto';

@UseGuards(AuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @Post('')
  async createOrganization(
    @Req() req,
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    return this.organizationService.createOrganization(
      req.role,
      createOrganizationDto,
    );
  }

  @Get('')
  async getAllOrganizations(@Req() req) {
    return this.organizationService.getAllOrganization(req.role);
  }
  @Get(':orgId')
  async getOrganizationDetails(@Param('orgId') orgId: string, @Req() req) {
    return this.organizationService.getOrganizationDetails(orgId, req.role);
  }

  @Put(':orgId')
  async editOrganizationDetails(
    @Param('orgId') orgId: string,
    @Req() req,
    @Body() editOrganizationDto: EditOrganizationDto,
  ) {
    return this.organizationService.editOrganizationDetails(
      orgId,
      req.role,
      editOrganizationDto,
      req.userId ?? null,
    );
  }

  @Delete(':orgId')
  async deleteOrganization(@Param('orgId') orgId: string, @Req() req) {
    return this.organizationService.deleteOrganization(orgId, req.role);
  }
}
