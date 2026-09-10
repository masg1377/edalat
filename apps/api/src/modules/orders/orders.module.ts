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
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  OrderStatus,
  UserRole,
  buildPagination,
  type PurchaseType,
} from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type RequestUser } from '../../common/auth.decorators';
import { mapOrderDetail } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { CartModule, CartService } from '../cart/cart.module';
import { PricingService } from '../pricing/pricing.service';

class CheckoutDto {
  @IsString()
  addressId!: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  customerNote?: string;
}

/** PRD §57/§35 — filters for `GET /orders/admin`. */
class AdminOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Partial, case-insensitive match against `orderNumber`. */
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

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

/** PRD §57 — admin order edits: status, tracking, an internal note. */
class UpdateOrderAdminDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  trackingCode?: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

const adminOrderUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
} as const;

function customerName(user: { firstName: string | null; lastName: string | null }): string | null {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full.length > 0 ? full : null;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly pricing: PricingService,
  ) {}

  private static orderNumber(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    return `EF-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  /**
   * Turns a cart into an order inside one transaction.
   *
   * Prices are re-quoted here, not copied from the cart, and stock is reserved
   * atomically — two customers racing for the last unit cannot both win.
   */
  async checkout(userId: string, dto: CheckoutDto) {
    const orderId = await this.checkoutTransaction(userId, dto);
    return this.findOne(userId, orderId);
  }

  private async checkoutTransaction(userId: string, dto: CheckoutDto): Promise<string> {
    const cart = await this.cart.read(userId);
    if (cart.items.length === 0) throw new BadRequestException('سبد خرید شما خالی است.');

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('آدرس یافت نشد.');

    const lines = await Promise.all(
      cart.items.map(async (item) => {
        const quote = await this.pricing.quote(
          item.product.id,
          item.purchaseType as PurchaseType,
          item.quantity,
        );
        return { item, quote };
      }),
    );

    const subtotal = lines.reduce((sum, { quote }) => sum + quote.total, 0);

    return this.prisma.$transaction(async (tx) => {
      for (const { item } of lines) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.product.id,
            stockQuantity: { gte: item.quantity },
          },
          data: { reservedQuantity: { increment: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException(`موجودی «${item.product.name}» کافی نیست.`);
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber: OrdersService.orderNumber(),
          userId,
          status: OrderStatus.AWAITING_PAYMENT,
          addressId: address.id,
          shippingSnapshot: {
            recipientName: address.recipientName,
            phone: address.phone,
            province: address.province,
            city: address.city,
            postalCode: address.postalCode,
            line: address.line,
          },
          subtotal,
          grandTotal: subtotal,
          shippingMethod: dto.shippingMethod ?? null,
          customerNote: dto.customerNote ?? null,
          items: {
            create: lines.map(({ item, quote }) => ({
              productId: item.product.id,
              productName: item.product.name,
              productSku: item.product.technicalCode ?? item.product.id,
              technicalCode: item.product.technicalCode,
              purchaseType: item.purchaseType,
              quantity: item.quantity,
              unitPrice: quote.unitPrice,
              lineTotal: quote.total,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      return order.id;
    });
  }

  private static mockRefId(): string {
    return `MOCK-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
  }

  /**
   * PRD §90.6 decision — MVP payment is Mock/Manual, no real gateway is wired.
   * This simulates a gateway callback: it records a `Payment(gateway: 'MOCK',
   * status: 'SUCCEEDED')`, moves the order to PAID, and — only now, not at
   * checkout — finalizes inventory (checkout merely reserved stock; this is
   * where it actually leaves the warehouse).
   */
  async confirmMockPayment(userId: string, orderId: string) {
    const finalizedId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('سفارش یافت نشد.');
      if (order.status !== OrderStatus.AWAITING_PAYMENT) {
        throw new BadRequestException('این سفارش در وضعیت قابل پرداخت نیست یا قبلاً پرداخت شده است.');
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: 'MOCK',
          amount: order.grandTotal,
          status: 'SUCCEEDED',
          refId: OrdersService.mockRefId(),
        },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      return order.id;
    });

    return this.findOne(userId, finalizedId);
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      itemCount: row._count.items,
      grandTotal: Number(row.grandTotal),
      createdAt: row.createdAt.toISOString(),
      trackingCode: row.trackingCode,
    }));
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true, payments: true, address: true },
    });
    if (!order) throw new NotFoundException('سفارش یافت نشد.');
    return mapOrderDetail(order);
  }

  /* ------------------------------------------------------------------ */
  /* PRD §57 — admin order management, not scoped to a single userId.    */
  /* ------------------------------------------------------------------ */

  private static buildAdminWhere(dto: AdminOrdersQueryDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (dto.status) where.status = dto.status;
    if (dto.orderNumber) {
      where.orderNumber = { contains: dto.orderNumber, mode: 'insensitive' };
    }
    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = {
        ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
        ...(dto.dateTo ? { lte: new Date(dto.dateTo) } : {}),
      };
    }
    return where;
  }

  async listForAdmin(dto: AdminOrdersQueryDto) {
    const where = OrdersService.buildAdminWhere(dto);
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: { user: { select: adminOrderUserSelect }, _count: { select: { items: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        itemCount: row._count.items,
        grandTotal: Number(row.grandTotal),
        createdAt: row.createdAt.toISOString(),
        trackingCode: row.trackingCode,
        customerName: customerName(row.user),
        customerPhone: row.user.phone,
      })),
      pagination: buildPagination(dto.page, dto.limit, total),
    };
  }

  async findOneForAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true, address: true, user: { select: adminOrderUserSelect } },
    });
    if (!order) throw new NotFoundException('سفارش یافت نشد.');

    return {
      ...mapOrderDetail(order),
      userId: order.user.id,
      customerName: customerName(order.user),
      customerPhone: order.user.phone,
      customerEmail: order.user.email ?? null,
      adminNote: order.adminNote ?? null,
    };
  }

  /**
   * PRD §35/§57 — admin status/tracking/note edits. Any enum value is
   * settable directly (an operator correcting a mis-click needs to move a
   * status backward too, not just forward through §35's happy path), but the
   * matching lifecycle timestamp (`shippedAt`/`deliveredAt`/`cancelledAt`/
   * `paidAt`) is stamped the first time that status is reached, the same way
   * `confirmMockPayment` already stamps `paidAt`.
   */
  async updateAdmin(id: string, dto: UpdateOrderAdminDto) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('سفارش یافت نشد.');

    const data: Prisma.OrderUpdateInput = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === OrderStatus.PAID && !existing.paidAt) data.paidAt = new Date();
      if (dto.status === OrderStatus.SHIPPED && !existing.shippedAt) data.shippedAt = new Date();
      if (dto.status === OrderStatus.DELIVERED && !existing.deliveredAt) data.deliveredAt = new Date();
      if (dto.status === OrderStatus.CANCELLED && !existing.cancelledAt) data.cancelledAt = new Date();
    }
    if (dto.trackingCode !== undefined) data.trackingCode = dto.trackingCode;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote;

    await this.prisma.order.update({ where: { id }, data });
    return this.findOneForAdmin(id);
  }
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /* ---- PRD §57 admin routes — must stay ahead of the customer-scoped ---- */
  /* ---- `:id` route below, or Express would match `/admin` to it first. -- */

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  @ApiOkResponse({ description: 'PRD §57 — paginated list of every order, not scoped to the caller.' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orderNumber', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  listAdmin(@Query() dto: AdminOrdersQueryDto) {
    return this.orders.listForAdmin(dto);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  findOneAdmin(@Param('id') id: string) {
    return this.orders.findOneForAdmin(id);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES_OPERATOR, UserRole.SUPER_ADMIN)
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateOrderAdminDto) {
    return this.orders.updateAdmin(id, dto);
  }

  /* ---------------------------- customer-scoped --------------------------- */

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.orders.listForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.orders.findOne(user.id, id);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.id, dto);
  }

  /**
   * Mock/Manual payment confirmation (PRD §90.6 decision — no real gateway in
   * the MVP). Simulates the callback a real gateway would send.
   */
  @Post(':id/confirm-mock-payment')
  confirmMockPayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.orders.confirmMockPayment(user.id, id);
  }
}

@Module({
  imports: [CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
