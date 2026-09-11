import {
  BadRequestException,
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
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_PAGE_SIZE,
  IdentificationStatus,
  MAX_PAGE_SIZE,
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
import { mapProductSummary, productSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateIdentificationRequestDto {
  /** Uploaded first via /uploads; this endpoint receives the resulting URLs. */
  @IsArray()
  @ArrayMinSize(1, { message: 'حداقل یک تصویر لازم است.' })
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images!: string[];

  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() vehicleLabel?: string;
  @IsOptional() @IsString() possibleName?: string;
  @IsOptional() @IsString() possibleCode?: string;
  @IsOptional() @IsString() brandGuess?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() contactPhone?: string;
}

/** فاز ۹ج — filters for `GET /product-requests/admin`. */
class AdminIdentificationQueryDto {
  @IsOptional()
  @IsEnum(IdentificationStatus)
  status?: IdentificationStatus;

  /** Partial, case-insensitive match against referenceNumber/possibleName/vehicleLabel. */
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
 * PRD §56 — admin edits on an image identification request. `identifiedProductId`
 * must reference a real, existing `Product` (Rule 3-style relation, not free
 * text) — validated in the service, 400 otherwise. `note`/`isPublic` control
 * the status-change `RequestEvent`, same contract as manufacturing's admin DTO.
 */
class UpdateIdentificationAdminDto {
  @IsOptional()
  @IsEnum(IdentificationStatus)
  status?: IdentificationStatus;

  @IsOptional()
  @IsString()
  identifiedProductId?: string;

  /** Customer-visible response (already surfaced in listForUser/findOne). */
  @IsOptional()
  @IsString()
  adminResponse?: string;

  /** Always-internal note — never returned to the customer. */
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

@Injectable()
export class ProductRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private static reference(): string {
    return `IMG-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
  }

  /**
   * PRD §11 / Rule 5 — in the MVP this is human-assisted: the customer sends a
   * photo, staff identify the part. The record already carries the fields an
   * AI pipeline would later fill (identifiedProductId, possibleCode), so
   * adding recognition means writing to the same rows, not reshaping them.
   */
  async create(dto: CreateIdentificationRequestDto, userId?: string) {
    return this.prisma.productIdentificationRequest.create({
      data: {
        ...dto,
        quantity: dto.quantity ?? 1,
        referenceNumber: ProductRequestsService.reference(),
        userId: userId ?? null,
        status: IdentificationStatus.SUBMITTED,
        events: {
          create: { toStatus: IdentificationStatus.SUBMITTED, note: 'تصویر دریافت شد.' },
        },
      },
      select: { id: true, referenceNumber: true, status: true, createdAt: true },
    });
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.productIdentificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { identifiedProduct: { select: productSummarySelect } },
    });
    return rows.map((row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      status: row.status,
      images: row.images,
      possibleCode: row.possibleCode,
      vehicleLabel: row.vehicleLabel,
      adminResponse: row.adminResponse,
      identifiedProduct: row.identifiedProduct ? mapProductSummary(row.identifiedProduct) : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.productIdentificationRequest.findFirst({
      where: { id, userId },
      include: {
        identifiedProduct: { select: productSummarySelect },
        events: { where: { isPublic: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return row;
  }

  /* ------------------------------------------------------------------ */
  /* فاز ۹ج — admin queue management, not scoped to a single userId.     */
  /* ------------------------------------------------------------------ */

  private static buildAdminWhere(
    dto: AdminIdentificationQueryDto,
  ): Prisma.ProductIdentificationRequestWhereInput {
    const where: Prisma.ProductIdentificationRequestWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { referenceNumber: { contains: dto.search, mode: 'insensitive' } },
        { possibleName: { contains: dto.search, mode: 'insensitive' } },
        { vehicleLabel: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async listForAdmin(dto: AdminIdentificationQueryDto) {
    const where = ProductRequestsService.buildAdminWhere(dto);
    const [rows, total] = await Promise.all([
      this.prisma.productIdentificationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: { identifiedProduct: { select: productSummarySelect } },
      }),
      this.prisma.productIdentificationRequest.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        identifiedProduct: row.identifiedProduct ? mapProductSummary(row.identifiedProduct) : null,
      })),
      pagination: buildPagination(dto.page, dto.limit, total),
    };
  }

  /** Unlike the customer-scoped `findOne`, this returns the FULL event trail (incl. internal notes). */
  async findOneForAdmin(id: string) {
    const row = await this.prisma.productIdentificationRequest.findUnique({
      where: { id },
      include: {
        identifiedProduct: { select: productSummarySelect },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return { ...row, identifiedProduct: row.identifiedProduct ? mapProductSummary(row.identifiedProduct) : null };
  }

  /**
   * PRD §12/§56 — same event-trail contract as ManufacturingService.updateAdmin.
   * `identifiedProductId` is a real FK (Rule 3): connecting it to a
   * non-existent product 400s rather than silently storing a dangling id.
   */
  async updateAdmin(id: string, dto: UpdateIdentificationAdminDto, actorId?: string) {
    const existing = await this.prisma.productIdentificationRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('درخواست یافت نشد.');

    if (dto.identifiedProductId !== undefined) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.identifiedProductId } });
      if (!product) throw new BadRequestException('محصول انتخاب‌شده یافت نشد.');
    }

    const data: Prisma.ProductIdentificationRequestUpdateInput = {};

    if (dto.adminResponse !== undefined) data.adminResponse = dto.adminResponse;
    if (dto.adminNotes !== undefined) data.adminNotes = dto.adminNotes;
    if (dto.identifiedProductId !== undefined) {
      data.identifiedProduct = { connect: { id: dto.identifiedProductId } };
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

    await this.prisma.productIdentificationRequest.update({ where: { id }, data });
    return this.findOneForAdmin(id);
  }
}

@ApiTags('product-requests')
@Controller({ path: 'product-requests', version: '1' })
export class ProductRequestsController {
  constructor(private readonly requests: ProductRequestsService) {}

  /**
   * Guests may submit. PRD §88 — a failed search must never be a dead end, and
   * forcing a login here is exactly the kind of dead end that loses the lead.
   * `OptionalJwtAuthGuard` still decodes a valid token when one is sent, so a
   * logged-in submitter's request shows up in their own dashboard instead of
   * always being recorded as anonymous.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() dto: CreateIdentificationRequestDto, @CurrentUser() user?: RequestUser) {
    return this.requests.create(dto, user?.id);
  }

  /* --- فاز ۹ج admin routes — must stay ahead of the customer-scoped `:id` -- */
  /* --- route below, or Nest would match `admin` to it as a request id.   -- */

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'PRD §56 — paginated list of every image identification request.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  listAdmin(@Query() dto: AdminIdentificationQueryDto) {
    return this.requests.listForAdmin(dto);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string) {
    return this.requests.findOneForAdmin(id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateIdentificationAdminDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.requests.updateAdmin(id, dto, user.id);
  }

  /* ---------------------------- customer-scoped --------------------------- */

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.requests.listForUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.requests.findOne(user.id, id);
  }
}

@Module({
  controllers: [ProductRequestsController],
  providers: [ProductRequestsService],
  exports: [ProductRequestsService],
})
export class ProductRequestsModule {}
