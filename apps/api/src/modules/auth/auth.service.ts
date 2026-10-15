import { randomInt, randomBytes, createHash } from 'node:crypto';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserRole } from '@edalat/shared';

import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Normalizes the many ways an Iranian mobile number gets typed. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '');
  if (digits.startsWith('0098')) return `0${digits.slice(4)}`;
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * PRD §30 — phone is the primary credential. We store only a hash of the OTP
   * and cap attempts, so a leaked database row cannot be replayed.
   */
  async requestOtp(
    rawPhone: string,
  ): Promise<{ phone: string; ttlSeconds: number; devCode?: string }> {
    const phone = normalizePhone(rawPhone);
    if (!isValidIranMobile(phone)) {
      throw new BadRequestException('شماره موبایل معتبر نیست.');
    }

    const ttlSeconds = Number(this.config.get('OTP_TTL_SECONDS') ?? 120);
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      throw new BadRequestException('کد قبلی هنوز معتبر است. کمی صبر کنید.');
    }

    const code = String(randomInt(10_000, 99_999));
    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    const provider = this.config.get<string>('SMS_PROVIDER');
    if (!provider) {
      // eslint-disable-next-line no-console
      console.log(`[dev] OTP for ${phone}: ${code}`);
    } else {
      // TODO: wire the configured SMS provider (Kavenegar / SMS.ir / Ghasedak).
    }

    return {
      phone,
      ttlSeconds,
      ...(this.config.get('NODE_ENV') !== 'production' ? { devCode: code } : {}),
    };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<AuthTokens & { isNewUser: boolean }> {
    const phone = normalizePhone(rawPhone);
    const maxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS') ?? 5);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('کد منقضی شده است. دوباره درخواست دهید.');
    if (otp.attempts >= maxAttempts) {
      throw new UnauthorizedException('تعداد تلاش‌ها بیش از حد مجاز است.');
    }

    if (otp.codeHash !== this.hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('کد وارد شده صحیح نیست.');
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    const user =
      existing ??
      (await this.prisma.user.create({
        data: { phone, phoneVerified: true, role: UserRole.CUSTOMER },
      }));

    if (existing && !existing.phoneVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.issueTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role as UserRole,
    });
    return { ...tokens, isNewUser: !existing };
  }

  /** Optional password login for staff accounts. */
  async loginWithPassword(rawPhone: string, password: string): Promise<AuthTokens> {
    const phone = normalizePhone(rawPhone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !user.isActive) {
      throw new UnauthorizedException('شماره یا رمز عبور نادرست است.');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('شماره یا رمز عبور نادرست است.');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens({ sub: user.id, phone: user.phone, role: user.role as UserRole });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('نشست معتبر نیست. دوباره وارد شوید.');
    }

    // Rotate: a refresh token is single-use.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      sub: stored.user.id,
      phone: stored.user.phone,
      role: stored.user.role as UserRole,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken
      .updateMany({
        where: { tokenHash: this.hash(refreshToken) },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // `expiresIn` is typed against ms's template-literal `StringValue`; the
      // value comes from the environment, so it is a plain string at runtime.
      expiresIn: accessTtl as `${number}m`,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const days =
      Number((this.config.get<string>('JWT_REFRESH_TTL') ?? '30d').replace(/\D/g, '')) || 30;
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(refreshToken),
        userId: payload.sub,
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });

    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }
}
