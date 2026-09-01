import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { OrderStatus, type PurchaseType } from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
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
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

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
