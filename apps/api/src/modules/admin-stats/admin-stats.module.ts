import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  IdentificationStatus,
  ManufacturingStatus,
  OrderStatus,
  UserRole,
} from '@edalat/shared';

import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PRD §52/§67/§68 — فاز ۹ه، آخرین فاز Admin Panel. یک endpoint واحد آماری
 * که همهٔ KPIهای دشبورد ادمین را برمی‌گرداند؛ `days` بازهٔ زمانی «فروش» و
 * «کاربران جدید» را کنترل می‌کند (پیش‌فرض ۳۰ روز، طبق پیشنهاد نقشه‌راه).
 * ordersByStatus/manufacturingByStatus/productRequestsByStatus عمداً
 * all-time هستند (نه محدود به بازه) چون هدفشان «سلامت کلی صف‌ها» است، نه
 * روند فروش.
 */
export class AdminStatsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number = 30;
}

/** PRD §35 — این وضعیت‌ها یعنی سفارش واقعاً پرداخت شده («PAID+»)، نه صرفاً ثبت‌شده. */
const PAID_PLUS_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * آستانهٔ Low Stock (PRD §58/§85). چون فاز ۹ه یک Admin Config UI برای این
 * آستانه در scope نداشت، به‌عنوان یک عدد ثابت منطقی انتخاب شد: قطعات/فیلتر
 * معمولاً واحدهای کوچک هستند و هر سفارش خرده چند عدد می‌برد؛ ۵ عدد
 * «موجودی قابل‌فروش» (stockQuantity - reservedQuantity) هشدار زودهنگام
 * می‌دهد بدون این‌که لیست را با موارد عادی پر کند. اگر بعداً نیاز به
 * تنظیم از Admin Panel افتاد، فاز ۱۰ می‌تواند این عدد را به یک ستون Config
 * تبدیل کند.
 */
const LOW_STOCK_THRESHOLD = 5;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function displayName(user: { firstName: string | null; lastName: string | null } | null): string {
  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() : '';
  return name || 'کاربر عدالت فیلتر';
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(dto: AdminStatsQueryDto) {
    const to = new Date();
    const from = new Date(to.getTime() - dto.days * 24 * 60 * 60 * 1000);

    const [
      periodOrders,
      ordersByStatusRaw,
      usersTotal,
      newUsersRaw,
      manufacturingByStatusRaw,
      productRequestsByStatusRaw,
      lowStockProducts,
      recentOrdersRaw,
    ] = await Promise.all([
      // Rule 1/PRD §67 — فروش = سفارش‌های PAID+ در بازه، برای مجموع و روند روزانه.
      this.prisma.order.findMany({
        where: { status: { in: PAID_PLUS_STATUSES }, createdAt: { gte: from, lte: to } },
        select: { grandTotal: true, createdAt: true },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.user.count(),
      this.prisma.user.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
      this.prisma.manufacturingRequest.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.productIdentificationRequest.groupBy({ by: ['status'], _count: { status: true } }),
      // PRD §58 — موجودی قابل‌فروش = stockQuantity - reservedQuantity؛ Prisma
      // نمی‌تواند این تفاضل را در where فیلتر کند، پس روی محصولات فعال
      // می‌خوانیم و خودمان فیلتر و صفحه‌بندی می‌کنیم (تعداد محصولات فعال در
      // این مقیاس MVP برای این کوئری مشکلی ایجاد نمی‌کند).
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, mainImageUrl: true, stockQuantity: true, reservedQuantity: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      }),
    ]);

    // --- Sales: total + daily breakdown ---
    let salesTotal = 0;
    const dailyMap = new Map<string, { total: number; orderCount: number }>();
    for (const order of periodOrders) {
      const total = Number(order.grandTotal);
      salesTotal += total;
      const key = toDateKey(order.createdAt);
      const bucket = dailyMap.get(key) ?? { total: 0, orderCount: 0 };
      bucket.total += total;
      bucket.orderCount += 1;
      dailyMap.set(key, bucket);
    }
    // بازهٔ خالی هم باید روزهای بدون سفارش را با صفر نشان دهد، وگرنه نمودار
    // روند نادرست به‌نظر می‌رسد (جهش‌های کاذب بین روزهای غیرمتوالی).
    const dailyBreakdown: { date: string; total: number; orderCount: number }[] = [];
    for (let i = dto.days - 1; i >= 0; i -= 1) {
      const day = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
      const key = toDateKey(day);
      const bucket = dailyMap.get(key);
      dailyBreakdown.push({ date: key, total: bucket?.total ?? 0, orderCount: bucket?.orderCount ?? 0 });
    }

    // --- New users: total in period + daily breakdown (همان الگوی فروش روزانه) ---
    const newUsers = newUsersRaw.length;
    const newUsersDailyMap = new Map<string, number>();
    for (const user of newUsersRaw) {
      const key = toDateKey(user.createdAt);
      newUsersDailyMap.set(key, (newUsersDailyMap.get(key) ?? 0) + 1);
    }
    const newUsersDailyBreakdown: { date: string; count: number }[] = [];
    for (let i = dto.days - 1; i >= 0; i -= 1) {
      const day = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
      const key = toDateKey(day);
      newUsersDailyBreakdown.push({ date: key, count: newUsersDailyMap.get(key) ?? 0 });
    }

    // --- ordersByStatus: all-time, هر enum که رکورد ندارد هم با صفر ظاهر شود ---
    const ordersByStatus: Record<string, number> = {};
    for (const status of Object.values(OrderStatus)) ordersByStatus[status] = 0;
    for (const row of ordersByStatusRaw) ordersByStatus[row.status] = row._count.status;

    const manufacturingByStatus: Record<string, number> = {};
    for (const status of Object.values(ManufacturingStatus)) manufacturingByStatus[status] = 0;
    for (const row of manufacturingByStatusRaw) manufacturingByStatus[row.status] = row._count.status;

    const productRequestsByStatus: Record<string, number> = {};
    for (const status of Object.values(IdentificationStatus)) productRequestsByStatus[status] = 0;
    for (const row of productRequestsByStatusRaw) productRequestsByStatus[row.status] = row._count.status;

    // --- Low stock: موجودی قابل‌فروش زیر آستانه، کم‌ترین موجودی اول ---
    const lowStockItems = lowStockProducts
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        mainImageUrl: p.mainImageUrl,
        stockQuantity: p.stockQuantity,
        reservedQuantity: p.reservedQuantity,
        availableQuantity: p.stockQuantity - p.reservedQuantity,
      }))
      .filter((p) => p.availableQuantity < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.availableQuantity - b.availableQuantity);

    return {
      period: { days: dto.days, from: from.toISOString(), to: to.toISOString() },
      sales: { total: salesTotal, orderCount: periodOrders.length, dailyBreakdown },
      ordersByStatus,
      usersCount: { total: usersTotal, newInPeriod: newUsers, dailyBreakdown: newUsersDailyBreakdown },
      manufacturingByStatus,
      productRequestsByStatus,
      lowStock: {
        threshold: LOW_STOCK_THRESHOLD,
        count: lowStockItems.length,
        items: lowStockItems.slice(0, 10),
      },
      recentOrders: recentOrdersRaw.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        grandTotal: Number(o.grandTotal),
        createdAt: o.createdAt,
        customerName: displayName(o.user),
      })),
      // PRD §68 — Search Analytics (ذخیرهٔ Query) هنوز در هیچ فازی پیاده
      // نشده (یک gap شناخته‌شده طبق claude/وضعیت-پیاده‌سازی.md)؛ ساختن
      // مکانیزم ذخیرهٔ Query از صفر خارج از scope فاز ۹ه است، پس این آرایه
      // عمداً خالی برمی‌گردد و به فاز ۱۰ منتقل می‌شود.
      popularSearches: [] as { query: string; count: number }[],
    };
  }
}

@ApiTags('admin-stats')
@Controller({ path: 'admin/stats', version: '1' })
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('overview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'days', required: false })
  @ApiOkResponse({ description: 'PRD §52 — دشبورد آماری ادمین (فاز ۹ه): فروش، سفارش‌ها، کاربران، صف‌های عملیاتی، Low Stock.' })
  overview(@Query() dto: AdminStatsQueryDto) {
    return this.stats.overview(dto);
  }
}

@Module({
  controllers: [AdminStatsController],
  providers: [AdminStatsService],
  exports: [AdminStatsService],
})
export class AdminStatsModule {}
