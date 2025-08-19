import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guard/auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async loginUser(@Body() body: { email: string; password: string }) {
    return await this.authService.loginUser(body.email, body.password);
  }
}
