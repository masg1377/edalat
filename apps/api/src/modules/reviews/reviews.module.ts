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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  OrderStatus,
  ReviewStatus,
  UserRole,
  buildPagination,
} from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type RequestUser } from '../../common/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';

/** PRD §36/§85 (فاز ۹د) — a logged-in customer's review of a product. */
export class CreateReviewDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ProductReviewQueryDto {
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

class AdminReviewQueryDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

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

/** PRD §36/§56 — admin decision on a review: Approve/Reject/Hide + an internal note. */
class UpdateReviewAdminDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}

type UserNameRow = { firstName: string | null; lastName: string | null } | null;

/** PRD §21 empty-state copy for an anonymous/unnamed reviewer. */
function displayName(user: UserNameRow): string {
  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : '';
  return name || 'کاربر عدالت فیلتر';
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PRD prompt فاز ۹د — "verified purchase" means the reviewer has an Order
   * containing this product that reached PAID or DELIVERED. Anything earlier
   * (PENDING/AWAITING_PAYMENT/…) or CANCELLED/RETURNED doesn't count.
   */
  private async computeIsVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
        items: { some: { productId } },
      },
      select: { id: true },
    });
    return !!order;
  }

  /**
   * Product.ratingAverage/ratingCount already exist on the schema and are
   * already wired into `CatalogSort.RATING` (products.service.ts) — they
   * were seed/mock values until now (`claude/وضعیت-پیاده‌سازی.md`, فاز ۲
   * note). Rather than adding a second "live aggregate" code path, this
   * keeps those same columns as the single source of truth and recomputes
   * them from APPROVED reviews whenever a review's status changes — cheap,
   * since status changes are rare admin actions, not a per-read cost.
   */
  private async syncProductRating(productId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating,
      },
    });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('محصول یافت نشد.');

    // @@unique([userId, productId]) — surface this as a clear 409, not a
    // raw Prisma P2002 error, per the phase prompt's explicit instruction.
    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) throw new ConflictException('شما قبلاً برای این محصول نظر ثبت کرده‌اید.');

    const isVerifiedPurchase = await this.computeIsVerifiedPurchase(userId, dto.productId);

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerifiedPurchase,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        isVerifiedPurchase: true,
        createdAt: true,
      },
    });
  }

  /** PRD §36 — public, APPROVED-only, feeds the Product Detail "نظرات کاربران" tab. */
  async listForProduct(productId: string, dto: ProductReviewQueryDto) {
    const where: Prisma.ReviewWhereInput = { productId, status: ReviewStatus.APPROVED };

    const [rows, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        isVerifiedPurchase: row.isVerifiedPurchase,
        userName: displayName(row.user),
        createdAt: row.createdAt,
      })),
      pagination: buildPagination(dto.page, dto.limit, total),
      averageRating: agg._avg.rating ?? 0,
    };
  }

  /** PRD §31/§36 — Dashboard → "نظرات من": every status, not just APPROVED. */
  async listMine(userId: string) {
    const rows = await this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, slug: true, name: true, mainImageUrl: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      productId: row.product.id,
      productSlug: row.product.slug,
      productName: row.product.name,
      productImageUrl: row.product.mainImageUrl,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      status: row.status,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
    }));
  }

  private static buildAdminWhere(dto: AdminReviewQueryDto): Prisma.ReviewWhereInput {
    const where: Prisma.ReviewWhereInput = {};
    if (dto.status) where.status = dto.status;
    return where;
  }

  /** PRD §56 — admin review queue. `stats` feeds the manage-reviews summary
   * cards (real numbers, not the full-version demo's hardcoded chart — see
   * claude/وضعیت-پیاده‌سازی.md, فاز ۹د). */
  async listForAdmin(dto: AdminReviewQueryDto) {
    const where = ReviewsService.buildAdminWhere(dto);

    const [rows, total, statusCounts, approvedAgg] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
          product: { select: { id: true, name: true, slug: true, mainImageUrl: true } },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.review.aggregate({
        where: { status: ReviewStatus.APPROVED },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const byStatus: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      HIDDEN: 0,
    };
    for (const row of statusCounts) byStatus[row.status] = row._count.status;

    return {
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        comment: row.comment,
        status: row.status,
        isVerifiedPurchase: row.isVerifiedPurchase,
        adminNote: row.adminNote,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userName: displayName(row.user),
        userPhone: row.user.phone,
        product: row.product,
      })),
      pagination: buildPagination(dto.page, dto.limit, total),
      stats: {
        byStatus,
        approvedAverageRating: approvedAgg._avg.rating ?? 0,
        approvedCount: approvedAgg._count.rating,
        total,
      },
    };
  }

  async findOneForAdmin(id: string) {
    const row = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        product: { select: { id: true, name: true, slug: true, mainImageUrl: true } },
      },
    });
    if (!row) throw new NotFoundException('نظر یافت نشد.');
    return {
      id: row.id,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      status: row.status,
      isVerifiedPurchase: row.isVerifiedPurchase,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userName: displayName(row.user),
      userPhone: row.user.phone,
      product: row.product,
    };
  }

  /** Approve/Reject/Hide + adminNote. Any status change resyncs the
   * product's cached rating (see `syncProductRating`). */
  async updateAdmin(id: string, dto: UpdateReviewAdminDto) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('نظر یافت نشد.');

    const data: Prisma.ReviewUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote;

    await this.prisma.review.update({ where: { id }, data });

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.syncProductRating(existing.productId);
    }

    return this.findOneForAdmin(id);
  }
}

@ApiTags('reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'PRD §36 — submit a review; starts PENDING until an admin approves it.' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: RequestUser) {
    return this.reviews.listMine(user.id);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listAdmin(@Query() dto: AdminReviewQueryDto) {
    return this.reviews.listForAdmin(dto);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string) {
    return this.reviews.findOneForAdmin(id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER, UserRole.SUPER_ADMIN)
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateReviewAdminDto) {
    return this.reviews.updateAdmin(id, dto);
  }
}

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
