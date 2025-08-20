import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guard/auth.guard';
import { AuthService } from './auth.service';
import { RegisterUserWithRoleDto } from 'src/dto/register-user-with-role';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async registerUserWithRole(
    @Body() registerUserWithRoleDto: RegisterUserWithRoleDto,
  ) {
    return await this.authService.registerUserWithRole(registerUserWithRoleDto);
  }

  @Post('login')
  async loginUser(@Body() body: { email: string; password: string }) {
    return await this.authService.loginUser(body.email, body.password);
  }
  @Post('refresh')
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }
}
