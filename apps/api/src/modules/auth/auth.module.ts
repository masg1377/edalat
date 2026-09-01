import { Body, Controller, Module, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { PasswordLoginDto, RefreshDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { JwtStrategy } from './jwt.strategy';

/**
 * `GET/PATCH /auth/me` used to live here as an ad-hoc pair bolted directly
 * onto this controller — no service layer, no `NotFoundException`, silently
 * dropping `phoneVerified`/`emailVerified`/`nationalId` from the response,
 * and never actually called by the frontend. PRD §78 lists `/users` as its
 * own API domain; phase 6 replaced this pair with the real `UsersModule`
 * (`GET/PATCH /users/me`) and removed the duplicate here. See
 * `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶".
 */
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Tight rate limit: OTP endpoints are the classic SMS-bombing target. */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: PasswordLoginDto) {
    return this.auth.loginWithPassword(dto.phone, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { ok: true };
  }
}

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
