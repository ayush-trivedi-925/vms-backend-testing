import { Body, Controller, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guard/auth.guard';
import { AuthService } from './auth.service';
import { RegisterRootDto } from '../dto/register-root.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register-root')
  async registerRoot(@Body() registerRootDto: RegisterRootDto) {
    return this.authService.registerRootUser(registerRootDto);
  }
  // @Post('register')
  // async registerUserWithRole(
  //   @Body() registerUserWithRoleDto: RegisterUserWithRoleDto,
  // ) {
  //   return await this.authService.registerUserWithRole(registerUserWithRoleDto);
  // }

  @Post('login')
  async loginUser(
    @Body() body: { email: string; password: string; newPassword?: string },
  ) {
    return await this.authService.loginUser(
      body.email,
      body.password,
      body.newPassword,
    );
  }
  @Post('refresh-token')
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(AuthGuard)
  @Put('change-password')
  async changePassword(
    @Req() req,
    @Body() data: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changeOldPassword(
      req.userId,
      data.oldPassword,
      data.newPassword,
    );
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req) {
    return this.authService.logout(req.userId, req.role);
  }
}
