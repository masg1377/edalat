import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MinLength, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, UserRole, buildPagination } from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type RequestUser } from '../../common/auth.decorators';
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

/** PRD §51 — filters for `GET /users/admin`. */
class AdminUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Partial match — phones are stored `09xxxxxxxxx`, no formatting to normalize. */
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}

/** PRD §51 — admin-only role/activation edits. Never touches password/contact fields. */
class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

const adminUserSelect = {
  id: true,
  phone: true,
  phoneVerified: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  companyName: true,
  nationalId: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

function mapAdminUser(row: AdminUserRow) {
  return {
    id: row.id,
    phone: row.phone,
    phoneVerified: row.phoneVerified,
    email: row.email ?? null,
    emailVerified: row.emailVerified,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    companyName: row.companyName ?? null,
    nationalId: row.nationalId ?? null,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

  /* ------------------------------------------------------------------ */
  /* PRD §51 — admin user management (list/detail/role & activation).    */
  /* ------------------------------------------------------------------ */

  async listForAdmin(dto: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.phone ? { phone: { contains: dto.phone } } : {}),
      ...(dto.email ? { email: { contains: dto.email, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map(mapAdminUser),
      pagination: buildPagination(dto.page, dto.limit, total),
    };
  }

  async findOneForAdmin(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, select: adminUserSelect });
    if (!row) throw new NotFoundException('کاربر یافت نشد.');
    return mapAdminUser(row);
  }

  /** PRD §51 — RBAC role changes and account activation/suspension. */
  async updateAdmin(id: string, dto: UpdateUserAdminDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('کاربر یافت نشد.');

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.findOneForAdmin(id);
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

  /* ---------------------------- PRD §51 admin routes ---------------------------- */

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'PRD §51 — paginated user list for staff management.' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'phone', required: false })
  @ApiQuery({ name: 'email', required: false })
  listAdmin(@Query() dto: AdminUsersQueryDto) {
    return this.users.listForAdmin(dto);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string) {
    return this.users.findOneForAdmin(id);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.users.updateAdmin(id, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
