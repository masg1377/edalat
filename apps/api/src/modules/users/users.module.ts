import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
import { mapUser } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PRD §31/§78 — the Dashboard → Profile tab. `firstName`/`lastName`/`email`
 * have existed on `User` since the schema was written, but nothing ever read
 * or wrote them: there was no `/users` domain, only the ad-hoc `GET/PATCH
 * /auth/me` pair bolted onto `AuthModule` (removed in this phase — see
 * `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶"). This module is the real
 * `/users` domain PRD §78 lists separately from `/auth`.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nationalId?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const row = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!row) throw new NotFoundException('کاربر یافت نشد.');
    return mapUser(row);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    try {
      const row = await this.prisma.user.update({
        where: { id: userId },
        // A changed email starts unverified again — verification is a
        // separate, not-yet-built flow, but the flag must not lie.
        data: { ...dto, ...(dto.email !== undefined ? { emailVerified: false } : {}) },
      });
      return mapUser(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('این ایمیل قبلاً برای حساب دیگری ثبت شده است.');
      }
      throw error;
    }
  }
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.users.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateUserDto) {
    return this.users.updateMe(user.id, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
