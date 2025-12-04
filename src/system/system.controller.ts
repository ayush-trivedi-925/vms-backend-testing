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
import { SystemService } from './system.service';
import { RegisterSystemUserDto } from 'src/dto/register-system-user.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { ResetPasswordDto } from 'src/dto/reset-password.dto';
import { EditSystemUserDto } from 'src/dto/edit-system-user.dto';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}
  @UseGuards(AuthGuard)
  @Post('register')
  async registerSystemUser(
    @Req() req,
    @Body() registerSystemUserDto: RegisterSystemUserDto,
  ) {
    return this.systemService.registerSystemUser(
      req.orgId,
      req.userId,
      req.role,
      registerSystemUserDto,
    );
  }

  @Post('login')
  async loginSystemUser(@Body() data: { email: string; password: string }) {
    return this.systemService.loginSystemUser(data.email, data.password);
  }

  @Post('refresh-system-access-token')
  async refreshSystemAccessToken(@Body() data: { token: string }) {
    return this.systemService.refreshSystemAccessToken(data.token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.systemService.forgotPassword(body.email);
  }
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.systemService.resetPassword(resetPasswordDto);
  }

  @UseGuards(AuthGuard)
  @Get('/status')
  async fetchSystemActivityStatus(@Req() req) {
    return this.systemService.fetchSystemActivityStatus(
      req.orgId,
      req.role,
      req.systemId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('verify')
  async verifySecureCode(
    @Req() req,
    @Body()
    data: {
      secretCode: string;
    },
  ) {
    return this.systemService.verifySecretCode(
      req.orgId,
      req.role,
      req.systemId,
      data.secretCode,
    );
  }

  @UseGuards(AuthGuard)
  @Post('verify-settingsCode')
  async verifySettingsCode(
    @Req() req,
    @Body()
    data: {
      secretCode: string;
    },
  ) {
    return this.systemService.verifySettingsCode(
      req.orgId,
      req.role,
      req.systemId,
      data.secretCode,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':systemId')
  async fetchSystemDetails(@Req() req, @Param('systemId') systemId: string) {
    return this.systemService.fetchSystemDetails(req.orgId, req.role, systemId);
  }

  @UseGuards(AuthGuard)
  @Get('')
  async getAllSystemAccounts(@Req() req) {
    return this.systemService.getAllSytemUser(req.orgId, req.role);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logoutSystemAccount(@Req() req) {
    return this.systemService.logoutSystemAccount(
      req.orgId,
      req.systemId,
      req.role,
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':systemId')
  async deleteSystemAccount(@Param('systemId') systemId: string, @Req() req) {
    return this.systemService.deleteSystemAccount(
      systemId,
      req.orgId,
      req.userId,
      req.role,
    );
  }

  @UseGuards(AuthGuard)
  @Post('logoutall')
  async logoutAllSystemAccounts(@Req() req) {
    return this.systemService.logoutAllSystemAccounts(
      req.orgId,
      req.role,
      req.userId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('/logout/:systemId')
  async logoutSystemAccountWeb(
    @Req() req,
    @Param('systemId') systemId: string,
  ) {
    return this.systemService.logoutSystemAccountWeb(
      systemId,
      req.orgId,
      req.userId,
      req.role,
    );
  }

  @UseGuards(AuthGuard)
  @Put(':systemId')
  async updateSystemDetails(
    @Req() req,
    @Param('systemId') systemId: string,
    @Body() editSystemUserDto: EditSystemUserDto,
  ) {
    return this.systemService.editSystemAccount(
      req.orgId,
      req.role,
      systemId,
      editSystemUserDto,
    );
  }
}
