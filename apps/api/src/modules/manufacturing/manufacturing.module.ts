import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ManufacturingStatus,
  UserRole,
  buildPagination,
} from '@edalat/shared';

import {
  CurrentUser,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  Roles,
  RolesGuard,
  type RequestUser,
} from '../../common/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';

/** Mirrors the six steps of the multi-step form in PRD §28. */
export class CreateManufacturingRequestDto {
  // Step 1 — customer
  @IsString() @MinLength(2) contactName!: string;
  @IsOptional() @IsString() companyName?: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() preferredContactMethod?: string;

  // Step 2 — brand
  @IsString() @MinLength(2) brandName!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() packagingDesignUrl?: string;

  // Step 3 — product
  @IsOptional() @IsString() productCategoryId?: string;
  @IsString() productType!: string;
  @IsOptional() @IsString() productName?: string;
  @IsOptional() @IsString() technicalCode?: string;
  @IsOptional() @IsString() targetVehicles?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;

  // Step 4 — reference material
  @IsOptional() @IsString() productImageUrl?: string;
  @IsOptional() @IsString() sampleImageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];

  // Step 5 — description
  @IsOptional() @IsString() description?: string;
}

/** PRD §55 (فاز ۹ج) — filters for `GET /manufacturing/requests/admin`. */
class AdminManufacturingQueryDto {
  @IsOptional()
  @IsEnum(ManufacturingStatus)
  status?: ManufacturingStatus;

  /** Partial, case-insensitive match against referenceNumber/contactName/companyName. */
  @IsOptional()
  @IsString()
  search?: string;

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

/**
 * PRD §55 — admin edits on a manufacturing request. `note`/`isPublic` are not
 * columns on the model itself (see schema.prisma) but control the
 * `RequestEvent` written when `status` changes: by default that event is
 * customer-visible (`isPublic: true`, mirroring `create()`'s own event),
 * unless the operator explicitly marks the transition as an internal-only
 * note by passing `isPublic: false`. `adminNotes` remains the separate,
 * always-internal column.
 */
class UpdateManufacturingAdminDto {
  @IsOptional()
  @IsEnum(ManufacturingStatus)
  status?: ManufacturingStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quotedUnitPrice?: number;

  @IsOptional()
  @IsDateString()
  quotedAt?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  /** Message attached to the status-change RequestEvent, if status changes. */
  @IsOptional()
  @IsString()
  note?: string;

  /** Whether the status-change RequestEvent is customer-visible. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaService) {}

  private static reference(): string {
    return `MFG-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
  }

  /**
   * A production enquiry is explicitly NOT a purchase (PRD §3.3): it creates a
   * request with its own status machine and an event trail the customer can follow.
   */
  async create(dto: CreateManufacturingRequestDto, userId?: string) {
    const request = await this.prisma.manufacturingRequest.create({
      data: {
        ...dto,
        attachments: dto.attachments ?? [],
        referenceNumber: ManufacturingService.reference(),
        userId: userId ?? null,
        status: ManufacturingStatus.SUBMITTED,
        events: {
          create: { toStatus: ManufacturingStatus.SUBMITTED, note: 'درخواست ثبت شد.' },
        },
      },
      select: { id: true, referenceNumber: true, status: true, createdAt: true },
    });
    return request;
  }

  async listForUser(userId: string) {
    return this.prisma.manufacturingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        brandName: true,
        productType: true,
        quantity: true,
        quotedUnitPrice: true,
        createdAt: true,
      },
    });
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.manufacturingRequest.findFirst({
      where: { id, userId },
      include: {
        events: { where: { isPublic: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return row;
  }

  /* ------------------------------------------------------------------ */
  /* فاز ۹ج — admin queue management, not scoped to a single userId.     */
  /* ------------------------------------------------------------------ */

  private static buildAdminWhere(dto: AdminManufacturingQueryDto): Prisma.ManufacturingRequestWhereInput {
    const where: Prisma.ManufacturingRequestWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { referenceNumber: { contains: dto.search, mode: 'insensitive' } },
        { contactName: { contains: dto.search, mode: 'insensitive' } },
        { companyName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async listForAdmin(dto: AdminManufacturingQueryDto) {
    const where = ManufacturingService.buildAdminWhere(dto);
    const [rows, total] = await Promise.all([
      this.prisma.manufacturingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.manufacturingRequest.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        quotedUnitPrice: row.quotedUnitPrice !== null ? Number(row.quotedUnitPrice) : null,
      })),
      pagination: buildPagination(dto.page, dto.limit, total),
    };
  }

  /** Unlike the customer-scoped `findOne`, this returns the FULL event trail (incl. internal notes). */
  async findOneForAdmin(id: string) {
    const row = await this.prisma.manufacturingRequest.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return { ...row, quotedUnitPrice: row.quotedUnitPrice !== null ? Number(row.quotedUnitPrice) : null };
  }

  /**
   * PRD §29/§55 — any enum value is settable directly (an operator correcting
   * a mis-click needs to move a status backward too), and — exactly like
   * `create()` seeds the first event — every status change appends a
   * `RequestEvent` with `fromStatus`/`toStatus` so the customer-facing
   * timeline (`findOne`, `isPublic: true` only) and the admin timeline
   * (`findOneForAdmin`, everything) both stay accurate.
   */
  async updateAdmin(id: string, dto: UpdateManufacturingAdminDto, actorId?: string) {
    const existing = await this.prisma.manufacturingRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('درخواست یافت نشد.');

    const data: Prisma.ManufacturingRequestUpdateInput = {};

    if (dto.adminNotes !== undefined) data.adminNotes = dto.adminNotes;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;

    if (dto.quotedUnitPrice !== undefined) {
      data.quotedUnitPrice = dto.quotedUnitPrice;
      data.quotedAt = dto.quotedAt ? new Date(dto.quotedAt) : new Date();
    } else if (dto.quotedAt !== undefined) {
      data.quotedAt = new Date(dto.quotedAt);
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;
      data.events = {
        create: {
          fromStatus: existing.status,
          toStatus: dto.status,
          note: dto.note ?? `وضعیت درخواست به «${dto.status}» تغییر کرد.`,
          actorId: actorId ?? null,
          isPublic: dto.isPublic ?? true,
        },
      };
    }

    await this.prisma.manufacturingRequest.update({ where: { id }, data });
    return this.findOneForAdmin(id);
  }
}

@ApiTags('manufacturing')
@Controller({ path: 'manufacturing', version: '1' })
export class ManufacturingController {
  constructor(private readonly manufacturing: ManufacturingService) {}

  /**
   * Open to guests — a lead should never be blocked behind a login (PRD §88).
   * `OptionalJwtAuthGuard` still decodes a valid token when one is sent, so a
   * logged-in submitter's request shows up in their own dashboard instead of
   * always being recorded as anonymous.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('requests')
  create(@Body() dto: CreateManufacturingRequestDto, @CurrentUser() user?: RequestUser) {
    return this.manufacturing.create(dto, user?.id);
  }

  /* ---- فاز ۹ج admin routes — must stay ahead of the customer-scoped ---- */
  /* ---- `requests/:id` route below, or Nest would match `admin` to it. -- */

  @Get('requests/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANUFACTURING_OPERATOR, UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'PRD §55 — paginated list of every manufacturing request.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  listAdmin(@Query() dto: AdminManufacturingQueryDto) {
    return this.manufacturing.listForAdmin(dto);
  }

  @Get('requests/admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANUFACTURING_OPERATOR, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string) {
    return this.manufacturing.findOneForAdmin(id);
  }

  @Patch('requests/admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANUFACTURING_OPERATOR, UserRole.SUPER_ADMIN)
  updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateManufacturingAdminDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.manufacturing.updateAdmin(id, dto, user.id);
  }

  /* ---------------------------- customer-scoped --------------------------- */

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('requests')
  list(@CurrentUser() user: RequestUser) {
    return this.manufacturing.listForUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('requests/:id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.manufacturing.findOne(user.id, id);
  }
}

@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
