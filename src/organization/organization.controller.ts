import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import { OrganizationService } from './organization.service';
import { AuthGuard } from 'src/guard/auth.guard';
import { EditOrganizationDto } from 'src/dto/edit-organization.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/service/multer/multer.config';
import { UpdateSubscriptionDto } from 'src/dto/update-subscription.dto';

@UseGuards(AuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  @Post('')
  async createOrganization(
    @Req() req,
    @Body() createOrganizationDto: CreateOrganizationDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.organizationService.createOrganization(
      req.role,
      createOrganizationDto,
      logo ?? undefined,
    );
  }

  @Get('settingCode')
  async getSettingCode(@Req() req) {
    return this.organizationService.getSettingsCode(
      req.orgId,
      req.role,
      req.userId,
    );
  }

  @Get('accountlimit')
  async getOrganizationAccountLimit(@Req() req) {
    return this.organizationService.getSystemAccountLimit(req.orgId, req.role);
  }

  @Get('')
  async getAllOrganizations(@Req() req) {
    return this.organizationService.getAllOrganization(req.role);
  }

  @Get('me/features')
  async getMyFeatures(@Req() req) {
    return this.organizationService.getMyFeatures(
      req.orgId,
      req.role,
      req.userId,
    );
  }

  @Get('plan/:orgId')
  async getOrgPlanDetails(@Param('orgId') orgId: string, @Req() req) {
    return this.organizationService.getOrgPlanDetails(orgId, req.role);
  }

  @Get(':orgId')
  async getOrganizationDetails(@Param('orgId') orgId: string, @Req() req) {
    return this.organizationService.getOrganizationDetails(orgId, req.role);
  }

  @UseInterceptors(FileInterceptor('logo', multerConfig))
  @Put(':orgId')
  async editOrganizationDetails(
    @Param('orgId') orgId: string,
    @Req() req,
    @Body() editOrganizationDto: EditOrganizationDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.organizationService.editOrganizationDetails(
      orgId,
      req.role,
      editOrganizationDto,
      req.userId ?? null,
      logo ?? undefined,
    );
  }

  @Put(':orgId/plan')
  async updateOrganizationPlan(
    @Req() req,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.organizationService.updateSubscription(
      req.userId,
      req.role,
      orgId,
      dto,
    );
  }

  @Delete(':orgId')
  async deleteOrganization(@Param('orgId') orgId: string, @Req() req) {
    return this.organizationService.deleteOrganization(orgId, req.role);
  }
}
