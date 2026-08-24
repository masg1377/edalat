import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PriceQuote, WholesalePriceTier } from '@edalat/shared';
import { PurchaseType } from '@edalat/shared';

import { PrismaService } from '../../prisma/prisma.service';

type TierRow = { minQuantity: number; maxQuantity: number | null; unitPrice: unknown };

/**
 * The single place where a price is decided.
 *
 * PRD Rule 1 — retail and wholesale are separate concepts.
 * PRD Rule 2 — wholesale is quantity-based, never one fixed number.
 * PRD §32/§77 — the backend never trusts a price sent by the frontend, so every
 * cart read, checkout and order line goes through `quote()`.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  static toTier(row: TierRow): WholesalePriceTier {
    return {
      minQuantity: row.minQuantity,
      maxQuantity: row.maxQuantity,
      unitPrice: Number(row.unitPrice),
    };
  }

  /**
   * Picks the tier whose [min, max] range contains `quantity`.
   * Tiers are sorted ascending; the last tier may be open-ended (max === null).
   */
  static resolveTier(tiers: WholesalePriceTier[], quantity: number): WholesalePriceTier | null {
    const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
    let match: WholesalePriceTier | null = null;
    for (const tier of sorted) {
      const withinLower = quantity >= tier.minQuantity;
      const withinUpper = tier.maxQuantity === null || quantity <= tier.maxQuantity;
      if (withinLower && withinUpper) {
        match = tier;
      }
    }
    return match;
  }

  static nextTier(tiers: WholesalePriceTier[], quantity: number): WholesalePriceTier | null {
    return (
      [...tiers]
        .sort((a, b) => a.minQuantity - b.minQuantity)
        .find((tier) => tier.minQuantity > quantity) ?? null
    );
  }

  /**
   * Server-side price for one product line. This is the only function allowed
   * to produce a number that ends up on an invoice.
   */
  async quote(
    productId: string,
    purchaseType: PurchaseType,
    quantity: number,
  ): Promise<PriceQuote> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('تعداد باید یک عدد صحیح و بزرگ‌تر از صفر باشد.');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: {
        id: true,
        retailPrice: true,
        minWholesaleQty: true,
        wholesaleRules: {
          select: { minQuantity: true, maxQuantity: true, unitPrice: true },
          orderBy: { minQuantity: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('محصول یافت نشد.');
    }

    const tiers = product.wholesaleRules.map(PricingService.toTier);
    const retailPrice = Number(product.retailPrice);

    if (purchaseType === PurchaseType.RETAIL) {
      return {
        productId: product.id,
        purchaseType,
        quantity,
        unitPrice: retailPrice,
        total: retailPrice * quantity,
        appliedTier: null,
        minQuantity: 1,
        // Surfacing the first wholesale tier lets the UI say
        // "buy 20 or more and pay X per unit" on a retail line.
        nextTier: tiers.length > 0 ? tiers[0] : null,
      };
    }

    if (tiers.length === 0) {
      throw new BadRequestException('برای این محصول قیمت عمده تعریف نشده است.');
    }

    const minQuantity = Math.max(product.minWholesaleQty, tiers[0].minQuantity);
    if (quantity < minQuantity) {
      throw new BadRequestException(`حداقل سفارش عمده این محصول ${minQuantity} عدد است.`);
    }

    const appliedTier = PricingService.resolveTier(tiers, quantity);
    if (!appliedTier) {
      throw new BadRequestException('برای این تعداد، قیمت عمده‌ای تعریف نشده است.');
    }

    return {
      productId: product.id,
      purchaseType,
      quantity,
      unitPrice: appliedTier.unitPrice,
      total: appliedTier.unitPrice * quantity,
      appliedTier,
      minQuantity,
      nextTier: PricingService.nextTier(tiers, quantity),
    };
  }

  /** Cheapest unit price across all wholesale tiers — used on listing cards. */
  static lowestWholesalePrice(tiers: WholesalePriceTier[]): number | null {
    if (tiers.length === 0) return null;
    return Math.min(...tiers.map((t) => t.unitPrice));
  }
}
