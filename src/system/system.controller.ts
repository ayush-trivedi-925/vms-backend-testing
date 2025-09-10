import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SystemService } from './system.service';
import { RegisterSystemUserDto } from 'src/dto/register-system-user.dto';
import { AuthGuard } from 'src/guard/auth.guard';

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

  @UseGuards(AuthGuard)
  @Get('')
  async getAllSystemAccounts(@Req() req) {
    return this.systemService.getAllSytemUser(req.orgId, req.role);
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
}
