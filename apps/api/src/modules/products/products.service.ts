import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CatalogResponse,
  ProductDetail,
  ProductSummary,
  SharedCompatibility,
  VehicleSummary,
} from '@edalat/shared';
import { CatalogSort, buildPagination } from '@edalat/shared';

import { buildFacets } from '../../common/facets';
import {
  mapProductDetail,
  mapProductSummary,
  mapVehicleSummary,
  productSummarySelect,
  vehicleSummarySelect,
} from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  /**
   * Column ordering for the catalog.
   *
   * `RELEVANCE` is absent on purpose: relevance order is produced by
   * SearchService's ranking, not by a database column, and is applied after the
   * ranked id list comes back. Without a query, relevance falls back to the
   * merchandising default below.
   */
  private static orderBy(sort?: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case CatalogSort.NEWEST:
        return [{ createdAt: 'desc' }];
      case CatalogSort.PRICE_ASC:
        return [{ retailPrice: 'asc' }];
      case CatalogSort.PRICE_DESC:
        return [{ retailPrice: 'desc' }];
      case CatalogSort.BEST_SELLING:
        return [{ salesCount: 'desc' }];
      case CatalogSort.RATING:
        return [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }];
      default:
        return [{ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' }];
    }
  }

  /**
   * Translates catalog filters into a Prisma predicate.
   *
   * Note what is NOT here: any text matching. When `q` is present the catalog
   * delegates to SearchService, so there is exactly one implementation of
   * search ranking in the codebase.
   */
  private static buildWhere(dto: CatalogQueryDto): Prisma.ProductWhereInput {
    const and: Prisma.ProductWhereInput[] = [{ isActive: true }];

    if (dto.categoryId) and.push({ categoryId: dto.categoryId });
    if (dto.category) and.push({ category: { slug: dto.category } });
    if (dto.brandId) and.push({ brandId: dto.brandId });
    if (dto.brand) and.push({ brand: { slug: dto.brand } });

    // Vehicle fit travels through the compatibility join, never free text.
    if (dto.vehicleId) and.push({ compatibilities: { some: { vehicleId: dto.vehicleId } } });
    if (dto.vehicleBrand || dto.vehicleModel) {
      and.push({
        compatibilities: {
          some: {
            vehicle: {
              ...(dto.vehicleBrand ? { brand: { slug: dto.vehicleBrand } } : {}),
              ...(dto.vehicleModel ? { model: dto.vehicleModel } : {}),
            },
          },
        },
      });
    }

    if (dto.minPrice !== undefined) and.push({ retailPrice: { gte: dto.minPrice } });
    if (dto.maxPrice !== undefined) and.push({ retailPrice: { lte: dto.maxPrice } });
    if (dto.inStock) and.push({ stockQuantity: { gt: 0 } });

    // "Show me what I can order wholesale" — products with at least one tier.
    if (dto.purchaseType === 'WHOLESALE') and.push({ wholesaleRules: { some: {} } });

    return { AND: and };
  }

  /**
   * `GET /products` — the catalog.
   *
   * Two paths, one filter predicate:
   *  - no `q`: a plain paginated query, ordered by the requested column.
   *  - with `q`: SearchService ranks the filtered set and returns ordered ids;
   *    those ids are then paginated here, preserving rank order for
   *    `sort=relevance` and re-ordering by column for anything else.
   */
  async catalog(dto: CatalogQueryDto): Promise<CatalogResponse> {
    const where = ProductsService.buildWhere(dto);
    const hasQuery = Boolean(dto.q && dto.q.trim().length > 0);

    if (!hasQuery) {
      const [rows, total, facets] = await Promise.all([
        this.prisma.product.findMany({
          where,
          select: productSummarySelect,
          orderBy: ProductsService.orderBy(dto.sort),
          skip: (dto.page - 1) * dto.limit,
          take: dto.limit,
        }),
        this.prisma.product.count({ where }),
        buildFacets(this.prisma, where),
      ]);

      return {
        items: rows.map(mapProductSummary),
        pagination: buildPagination(dto.page, dto.limit, total),
        normalizedQuery: null,
        exactCodeMatchId: null,
        facets,
      };
    }

    const ranked = await this.search.rankProductIds(dto.q!, where);
    const total = ranked.ids.length;

    void this.search.logQuery({
      rawQuery: dto.q!,
      normalizedQuery: ranked.normalizedQuery,
      resultCount: total,
      source: 'TEXT',
      vehicleId: dto.vehicleId,
    });

    if (total === 0) {
      return {
        items: [],
        pagination: buildPagination(dto.page, dto.limit, 0),
        normalizedQuery: ranked.normalizedQuery,
        exactCodeMatchId: null,
        facets: { brands: [], categories: [], priceRange: { min: 0, max: 0 } },
      };
    }

    const relevanceOrder = !dto.sort || dto.sort === CatalogSort.RELEVANCE;
    const skip = (dto.page - 1) * dto.limit;

    let items: ProductSummary[];
    if (relevanceOrder) {
      // Slice the ranked ids, then hydrate only that page.
      const pageIds = ranked.ids.slice(skip, skip + dto.limit);
      const rows = await this.prisma.product.findMany({
        where: { id: { in: pageIds } },
        select: productSummarySelect,
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      // `in` does not preserve order, so re-apply the ranking.
      items = pageIds.flatMap((id) => {
        const row = byId.get(id);
        return row ? [mapProductSummary(row)] : [];
      });
    } else {
      // Column sorts are done in the database over the ranked id set.
      const rows = await this.prisma.product.findMany({
        where: { id: { in: ranked.ids } },
        select: productSummarySelect,
        orderBy: ProductsService.orderBy(dto.sort),
        skip,
        take: dto.limit,
      });
      items = rows.map(mapProductSummary);
    }

    const facets = await buildFacets(this.prisma, { id: { in: ranked.ids } });

    return {
      items,
      pagination: buildPagination(dto.page, dto.limit, total),
      normalizedQuery: ranked.normalizedQuery,
      exactCodeMatchId: ranked.exactCodeMatchId,
      facets,
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
