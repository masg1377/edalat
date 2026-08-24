import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import type { Cart, CartItem } from '@edalat/shared';
import { PurchaseType } from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
import { mapProductSummary, productSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

class AddItemDto {
  @IsString()
  productId!: string;

  @IsEnum(PurchaseType)
  purchaseType: PurchaseType = PurchaseType.RETAIL;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

class UpdateItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  private async getOrCreate(userId: string) {
    const existing = await this.prisma.cart.findFirst({ where: { userId } });
    return existing ?? this.prisma.cart.create({ data: { userId } });
  }

  /**
   * PRD §32 — prices are recomputed here on every read. The `unitPriceSnapshot`
   * column is a display cache only; it never decides what the customer pays.
   */
  async read(userId: string): Promise<Cart> {
    const cart = await this.getOrCreate(userId);
    const rows = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: { select: productSummarySelect } },
      orderBy: { createdAt: 'asc' },
    });

    const items: CartItem[] = [];
    for (const row of rows) {
      let unitPrice: number;
      let warning: string | null = null;

      try {
        const quote = await this.pricing.quote(
          row.productId,
          row.purchaseType as PurchaseType,
          row.quantity,
        );
        unitPrice = quote.unitPrice;
      } catch (error) {
        // A wholesale line can fall below the minimum after an admin edits the
        // tiers. Fall back to retail and tell the customer, rather than 500ing.
        unitPrice = Number(row.product.retailPrice);
        warning = error instanceof Error ? error.message : 'قیمت این محصول قابل محاسبه نیست.';
      }

      items.push({
        id: row.id,
        product: mapProductSummary(row.product),
        purchaseType: row.purchaseType as PurchaseType,
        quantity: row.quantity,
        unitPrice,
        lineTotal: unitPrice * row.quantity,
        warning,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return {
      id: cart.id,
      items,
      subtotal,
      discountTotal: 0,
      shippingTotal: 0,
      grandTotal: subtotal,
      currency: 'IRT',
    };
  }

  async addItem(userId: string, dto: AddItemDto): Promise<Cart> {
    // Validates min-quantity and tier existence before anything is persisted.
    await this.pricing.quote(dto.productId, dto.purchaseType, dto.quantity);
    const cart = await this.getOrCreate(userId);

    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: dto.productId },
      select: { retailPrice: true },
    });

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId_purchaseType: {
          cartId: cart.id,
          productId: dto.productId,
          purchaseType: dto.purchaseType,
        },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        purchaseType: dto.purchaseType,
        quantity: dto.quantity,
        unitPriceSnapshot: product.retailPrice,
      },
      update: { quantity: { increment: dto.quantity } },
    });

    return this.read(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number): Promise<Cart> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new NotFoundException('این محصول در سبد خرید شما نیست.');

    await this.pricing.quote(item.productId, item.purchaseType as PurchaseType, quantity);
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.read(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
    return this.read(userId);
  }

  async clear(userId: string): Promise<Cart> {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.read(userId);
  }
}

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  read(@CurrentUser() user: RequestUser) {
    return this.cart.read(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: RequestUser, @Body() dto: AddItemDto) {
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.cart.updateItem(user.id, id, dto.quantity);
  }

  @Delete('items/:id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cart.removeItem(user.id, id);
  }

  @Delete()
  clear(@CurrentUser() user: RequestUser) {
    return this.cart.clear(user.id);
  }
}

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
