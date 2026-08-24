import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  Paginated,
  ProductDetail,
  ProductSummary,
  SharedCompatibility,
  VehicleSummary,
} from '@edalat/shared';
import { SearchSort, normalizePersian } from '@edalat/shared';

import {
  mapProductDetail,
  mapProductSummary,
  mapVehicleSummary,
  productSummarySelect,
  vehicleSummarySelect,
} from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { ListProductsDto } from './dto/list-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private static orderBy(sort?: SearchSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case SearchSort.NEWEST:
        return [{ createdAt: 'desc' }];
      case SearchSort.BEST_SELLING:
        return [{ salesCount: 'desc' }];
      case SearchSort.PRICE_ASC:
        return [{ retailPrice: 'asc' }];
      case SearchSort.PRICE_DESC:
        return [{ retailPrice: 'desc' }];
      case SearchSort.RATING:
        return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }];
      default:
        return [{ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' }];
    }
  }

  private buildWhere(dto: ListProductsDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { isActive: true };
    const and: Prisma.ProductWhereInput[] = [];

    if (dto.categoryId) and.push({ categoryId: dto.categoryId });
    if (dto.categorySlug) and.push({ category: { slug: dto.categorySlug } });
    if (dto.brandId) and.push({ brandId: dto.brandId });
    if (dto.brandSlug) and.push({ brand: { slug: dto.brandSlug } });

    // Vehicle filters travel through the compatibility join, never free text.
    if (dto.vehicleId) {
      and.push({ compatibilities: { some: { vehicleId: dto.vehicleId } } });
    }
    if (dto.vehicleBrandId || dto.vehicleModel || dto.year) {
      const vehicle: Prisma.VehicleWhereInput = {};
      if (dto.vehicleBrandId) vehicle.brandId = dto.vehicleBrandId;
      if (dto.vehicleModel) vehicle.model = { contains: dto.vehicleModel, mode: 'insensitive' };
      if (dto.year) {
        vehicle.AND = [
          { OR: [{ yearFrom: null }, { yearFrom: { lte: dto.year } }] },
          { OR: [{ yearTo: null }, { yearTo: { gte: dto.year } }] },
        ];
      }
      and.push({ compatibilities: { some: { vehicle } } });
    }

    if (dto.minPrice !== undefined) and.push({ retailPrice: { gte: dto.minPrice } });
    if (dto.maxPrice !== undefined) and.push({ retailPrice: { lte: dto.maxPrice } });
    if (dto.inStock) and.push({ stockQuantity: { gt: 0 } });

    // "Show me only what I can order wholesale" — products with at least one tier.
    if (dto.purchaseType === 'WHOLESALE') {
      and.push({ wholesaleRules: { some: {} } });
    }

    if (dto.q) {
      const q = normalizePersian(dto.q);
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { technicalCode: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { oemCodes: { has: q.toUpperCase() } },
          { aliases: { has: q } },
        ],
      });
    }

    if (and.length > 0) where.AND = and;
    return where;
  }

  async list(dto: ListProductsDto): Promise<Paginated<ProductSummary>> {
    const where = this.buildWhere(dto);
    const skip = (dto.page - 1) * dto.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSummarySelect,
        orderBy: ProductsService.orderBy(dto.sort),
        skip,
        take: dto.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(mapProductSummary),
      page: dto.page,
      pageSize: dto.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.pageSize)),
    };
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const row = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      select: {
        ...productSummarySelect,
        description: true,
        sku: true,
        oemCodes: true,
        images: true,
        specifications: true,
        replacementKm: true,
        replacementKmMax: true,
        replacementMonths: true,
        replacementNotes: true,
        compatibilities: {
          select: { vehicle: { select: vehicleSummarySelect } },
          orderBy: { vehicle: { model: 'asc' } },
        },
        relatedTo: {
          select: { kind: true, target: { select: productSummarySelect } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!row) throw new NotFoundException('محصول یافت نشد.');

    await this.prisma.product
      .update({ where: { id: row.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    return mapProductDetail(row);
  }

  /** PRD §80 — every vehicle this product fits. */
  async vehiclesFor(productId: string): Promise<VehicleSummary[]> {
    const rows = await this.prisma.productVehicleCompatibility.findMany({
      where: { productId },
      select: { vehicle: { select: vehicleSummarySelect } },
      orderBy: [{ vehicle: { brand: { name: 'asc' } } }, { vehicle: { model: 'asc' } }],
    });
    return rows.map((r) => mapVehicleSummary(r.vehicle));
  }

  /**
   * PRD §20 — "this part is also shared with these other cars".
   * Given a product and the vehicle the customer arrived from, list the rest.
   */
  async sharedCompatibility(slug: string, vehicleId: string): Promise<SharedCompatibility> {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      select: productSummarySelect,
    });
    if (!product) throw new NotFoundException('محصول یافت نشد.');

    const rows = await this.prisma.productVehicleCompatibility.findMany({
      where: { productId: product.id, vehicleId: { not: vehicleId } },
      select: { vehicle: { select: vehicleSummarySelect } },
      orderBy: [{ vehicle: { brand: { name: 'asc' } } }, { vehicle: { model: 'asc' } }],
    });

    return {
      product: mapProductSummary(product),
      selectedVehicleId: vehicleId,
      sharedWith: rows.map((r) => mapVehicleSummary(r.vehicle)),
    };
  }

  async featured(limit = 8): Promise<ProductSummary[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: productSummarySelect,
      orderBy: [{ salesCount: 'desc' }],
      take: limit,
    });
    return rows.map(mapProductSummary);
  }

  async bestSelling(limit = 8): Promise<ProductSummary[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      select: productSummarySelect,
      orderBy: [{ salesCount: 'desc' }, { ratingAverage: 'desc' }],
      take: limit,
    });
    return rows.map(mapProductSummary);
  }
}
