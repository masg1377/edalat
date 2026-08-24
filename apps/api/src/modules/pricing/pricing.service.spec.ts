import type { WholesalePriceTier } from '@edalat/shared';

import { PricingService } from './pricing.service';

const tiers: WholesalePriceTier[] = [
  { minQuantity: 20, maxQuantity: 49, unitPrice: 275_000 },
  { minQuantity: 50, maxQuantity: 99, unitPrice: 260_000 },
  { minQuantity: 100, maxQuantity: null, unitPrice: 245_000 },
];

describe('PricingService.resolveTier', () => {
  it('picks the tier containing the quantity', () => {
    expect(PricingService.resolveTier(tiers, 20)?.unitPrice).toBe(275_000);
    expect(PricingService.resolveTier(tiers, 49)?.unitPrice).toBe(275_000);
    expect(PricingService.resolveTier(tiers, 50)?.unitPrice).toBe(260_000);
    expect(PricingService.resolveTier(tiers, 99)?.unitPrice).toBe(260_000);
  });

  it('uses the open-ended top tier for large quantities', () => {
    expect(PricingService.resolveTier(tiers, 100)?.unitPrice).toBe(245_000);
    expect(PricingService.resolveTier(tiers, 10_000)?.unitPrice).toBe(245_000);
  });

  it('returns null below the first tier', () => {
    expect(PricingService.resolveTier(tiers, 19)).toBeNull();
  });

  it('is order-independent', () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(PricingService.resolveTier(shuffled, 60)?.unitPrice).toBe(260_000);
  });
});

describe('PricingService.nextTier', () => {
  it('points at the next quantity break for upsell copy', () => {
    expect(PricingService.nextTier(tiers, 30)?.minQuantity).toBe(50);
    expect(PricingService.nextTier(tiers, 120)).toBeNull();
  });
});

describe('PricingService.lowestWholesalePrice', () => {
  it('returns the cheapest tier price', () => {
    expect(PricingService.lowestWholesalePrice(tiers)).toBe(245_000);
  });

  it('returns null when no wholesale pricing exists', () => {
    expect(PricingService.lowestWholesalePrice([])).toBeNull();
  });
});
