import { Controller, Post, Get, Body, Res, Req, UseGuards } from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto, SendOtpDto, VerifyOtpDto } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response, Request } from 'express';
import { UserRole } from '@educaro/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyOtp(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('demo-login')
  async demoLogin(
    @Body('role') role: UserRole = UserRole.APPLICANT,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.demoLogin(role);

    this.setRefreshCookie(res, result.refreshToken);
    return {
      success: true,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: any }) {
    return {
      success: true,
      user: req.user,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    return { success: true, message: 'Logged out successfully' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
