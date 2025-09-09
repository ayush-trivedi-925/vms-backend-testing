import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guard/auth.guard';
import { AuthService } from './auth.service';
import { RegisterRootDto } from 'src/dto/register-root.dto';

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
  @Post('refresh-user-access-token')
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }
}
