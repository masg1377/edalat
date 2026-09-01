import type {
  Address,
  BrandSummary,
  CategorySummary,
  OrderDetail,
  OrderItemDetail,
  PaymentSummary,
  ProductDetail,
  ProductSummary,
  ReplacementInfo,
  UserProfile,
  VehicleBrandSummary,
  VehicleDetail,
  VehicleSummary,
} from '@edalat/shared';

import { PricingService } from '../modules/pricing/pricing.service';

/* Prisma returns Decimal objects and nullable relations; these mappers are the
 * boundary where database rows become the API contract in `@edalat/shared`. */

export const brandSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  country: true,
} as const;

export const categorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  imageUrl: true,
} as const;

export const productSummarySelect = {
  id: true,
  slug: true,
  name: true,
  mainImageUrl: true,
  technicalCode: true,
  retailPrice: true,
  minWholesaleQty: true,
  stockQuantity: true,
  reservedQuantity: true,
  ratingAverage: true,
  ratingCount: true,
  brand: { select: brandSelect },
  category: { select: categorySelect },
  wholesaleRules: {
    select: { minQuantity: true, maxQuantity: true, unitPrice: true },
    orderBy: { minQuantity: 'asc' },
  },
  // A count, not the rows: the catalog card shows "fits N vehicles" and must
  // not pull every compatibility row for every product on the page.
  _count: { select: { compatibilities: true } },
} as const;

export const vehicleSummarySelect = {
  id: true,
  slug: true,
  model: true,
  generation: true,
  yearFrom: true,
  yearTo: true,
  engine: true,
  engineCode: true,
  brand: { select: { id: true, name: true, slug: true, logoUrl: true, country: true } },
} as const;

type AnyRow = Record<string, any>;

export function mapBrand(row: AnyRow | null): BrandSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl ?? null,
    country: row.country ?? null,
  };
}

export function mapCategory(row: AnyRow | null): CategorySummary | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId ?? null,
    imageUrl: row.imageUrl ?? null,
    ...(row._count?.products !== undefined ? { productCount: row._count.products } : {}),
  };
}

export function mapVehicleBrand(row: AnyRow): VehicleBrandSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl ?? null,
    country: row.country ?? null,
  };
}

export function mapVehicleSummary(row: AnyRow): VehicleSummary {
  return {
    id: row.id,
    slug: row.slug,
    brand: mapVehicleBrand(row.brand),
    model: row.model,
    generation: row.generation ?? null,
    yearFrom: row.yearFrom ?? null,
    yearTo: row.yearTo ?? null,
    engine: row.engine ?? null,
    engineCode: row.engineCode ?? null,
  };
}

export function mapVehicleDetail(row: AnyRow): VehicleDetail {
  return {
    ...mapVehicleSummary(row),
    displacement: row.displacement ?? null,
    fuelType: row.fuelType ?? null,
    transmission: row.transmission ?? null,
    bodyType: row.bodyType ?? null,
    specifications: (row.specifications ?? {}) as Record<string, string>,
    service: row.service
      ? {
          engineOilGrade: row.service.engineOilGrade ?? null,
          engineOilCapacityLiters:
            row.service.engineOilCapacityLiters === null ||
            row.service.engineOilCapacityLiters === undefined
              ? null
              : Number(row.service.engineOilCapacityLiters),
          oilChangeKm: row.service.oilChangeKm ?? null,
          oilFilterChangeKm: row.service.oilFilterChangeKm ?? null,
          airFilterChangeKm: row.service.airFilterChangeKm ?? null,
          cabinFilterChangeKm: row.service.cabinFilterChangeKm ?? null,
          fuelFilterChangeKm: row.service.fuelFilterChangeKm ?? null,
          notes: row.service.notes ?? null,
        }
      : null,
  };
}

export function mapProductSummary(row: AnyRow): ProductSummary {
  const tiers = (row.wholesaleRules ?? []).map(PricingService.toTier);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: mapBrand(row.brand ?? null),
    category: mapCategory(row.category ?? null),
    mainImageUrl: row.mainImageUrl ?? null,
    technicalCode: row.technicalCode ?? null,
    retailPrice: Number(row.retailPrice),
    lowestWholesalePrice: PricingService.lowestWholesalePrice(tiers),
    minWholesaleQuantity:
      tiers.length > 0 ? Math.max(row.minWholesaleQty ?? 1, tiers[0].minQuantity) : null,
    compatibleVehicleCount: row._count?.compatibilities ?? 0,
    ratingAverage: row.ratingAverage ?? 0,
    ratingCount: row.ratingCount ?? 0,
    inStock: Math.max(0, (row.stockQuantity ?? 0) - (row.reservedQuantity ?? 0)) > 0,
  };
}

function mapReplacement(row: AnyRow): ReplacementInfo | null {
  if (!row.replacementKm && !row.replacementMonths && !row.replacementNotes) return null;
  return {
    km: row.replacementKm ?? null,
    kmMax: row.replacementKmMax ?? null,
    months: row.replacementMonths ?? null,
    notes: row.replacementNotes ?? null,
  };
}

export function mapProductDetail(row: AnyRow): ProductDetail {
  const summary = mapProductSummary(row);
  const tiers = (row.wholesaleRules ?? []).map(PricingService.toTier);

  return {
    ...summary,
    description: row.description ?? null,
    sku: row.sku,
    oemCodes: row.oemCodes ?? [],
    images: row.images ?? [],
    specifications: (row.specifications ?? {}) as Record<string, string>,
    wholesaleTiers: tiers,
    replacement: mapReplacement(row),
    availableQuantity: Math.max(0, (row.stockQuantity ?? 0) - (row.reservedQuantity ?? 0)),
    compatibleVehicles: (row.compatibilities ?? []).map((c: AnyRow) => mapVehicleSummary(c.vehicle)),
    relatedProducts: (row.relatedTo ?? [])
      .filter((r: AnyRow) => r.kind === 'RELATED')
      .map((r: AnyRow) => mapProductSummary(r.target)),
    similarProducts: (row.relatedTo ?? [])
      .filter((r: AnyRow) => r.kind === 'SIMILAR')
      .map((r: AnyRow) => mapProductSummary(r.target)),
  };
}

export function mapUser(row: AnyRow): UserProfile {
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
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapAddress(row: AnyRow | null): Address | null {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    recipientName: row.recipientName,
    phone: row.phone,
    province: row.province,
    city: row.city,
    postalCode: row.postalCode ?? null,
    line: row.line,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapOrderItem(row: AnyRow): OrderItemDetail {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    productSku: row.productSku,
    technicalCode: row.technicalCode ?? null,
    purchaseType: row.purchaseType,
    quantity: row.quantity,
    unitPrice: Number(row.unitPrice),
    lineTotal: Number(row.lineTotal),
  };
}

export function mapPayment(row: AnyRow): PaymentSummary {
  return {
    id: row.id,
    gateway: row.gateway,
    amount: Number(row.amount),
    status: row.status,
    refId: row.refId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** PRD §34/§35 — the checkout response and the order confirmation/detail page. */
export function mapOrderDetail(row: AnyRow): OrderDetail {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    address: mapAddress(row.address ?? null),
    shippingMethod: row.shippingMethod ?? null,
    trackingCode: row.trackingCode ?? null,
    customerNote: row.customerNote ?? null,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discountTotal),
    shippingTotal: Number(row.shippingTotal),
    taxTotal: Number(row.taxTotal),
    grandTotal: Number(row.grandTotal),
    items: (row.items ?? []).map(mapOrderItem),
    payments: (row.payments ?? []).map(mapPayment),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
