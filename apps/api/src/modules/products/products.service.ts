import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CatalogResponse,
  ProductDetail,
  ProductSummary,
  SharedCompatibility,
  VehicleSummary,
} from '@edalat/shared';
import { CatalogSort, buildPagination, slugify } from '@edalat/shared';

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
import type {
  CreateCompatibilityDto,
  CreateProductDto,
  UpdateCompatibilityDto,
  UpdateProductDto,
} from './dto/product-write.dto';

/** Same shape `findBySlug` selects, minus the `isActive` filter and the
 * view-count side effect — the admin write endpoints need the full detail
 * back regardless of active state, and must never count as a customer view. */
const productDetailSelect = {
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
    orderBy: { vehicle: { model: 'asc' } as const },
  },
  relatedTo: {
    select: { kind: true, target: { select: productSummarySelect } },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ProductSelect;

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

  /* ------------------------------------------------------------------ */
  /* PRD §53 — admin writes. Reads above stay untouched; everything below */
  /* is reachable only through RolesGuard-protected controller methods.  */
  /* ------------------------------------------------------------------ */

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'product';
    let candidate = root;
    let suffix = 2;
    for (;;) {
      const existing = await this.prisma.product.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${root}-${suffix++}`;
    }
  }

  /**
   * Full editable row for the admin Product add/edit page — every field the
   * write DTOs accept, plus wholesale-tier and compatibility row ids (the
   * public `findBySlug`/`ProductDetail` shape intentionally drops these:
   * ids for PATCH targets, inactive products, `isFeatured`/`isManufactured`,
   * `metaTitle`/`metaDescription`). Guarded by RolesGuard in the controller
   * — unlike every other read on this service, this one is admin-only.
   */
  async findForEdit(id: string) {
    const row = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        shortDescription: true,
        sku: true,
        technicalCode: true,
        oemCodes: true,
        aliases: true,
        keywords: true,
        brandId: true,
        categoryId: true,
        mainImageUrl: true,
        images: true,
        specifications: true,
        retailPrice: true,
        compareAtPrice: true,
        minWholesaleQty: true,
        stockQuantity: true,
        replacementKm: true,
        replacementKmMax: true,
        replacementMonths: true,
        replacementNotes: true,
        isActive: true,
        isManufactured: true,
        isFeatured: true,
        metaTitle: true,
        metaDescription: true,
        wholesaleRules: {
          select: { id: true, minQuantity: true, maxQuantity: true, unitPrice: true },
          orderBy: { minQuantity: 'asc' },
        },
        compatibilities: {
          select: {
            id: true,
            vehicleId: true,
            isExactFit: true,
            notes: true,
            replacementKm: true,
            replacementKmMax: true,
            replacementMonths: true,
            vehicle: { select: vehicleSummarySelect },
          },
          orderBy: { vehicle: { model: 'asc' } },
        },
      },
    });
    if (!row) throw new NotFoundException('محصول یافت نشد.');

    return {
      ...row,
      retailPrice: Number(row.retailPrice),
      compareAtPrice: row.compareAtPrice !== null ? Number(row.compareAtPrice) : null,
      wholesaleRules: row.wholesaleRules.map((t) => ({
        id: t.id,
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity,
        unitPrice: Number(t.unitPrice),
      })),
      compatibilities: row.compatibilities.map((c) => ({
        id: c.id,
        vehicleId: c.vehicleId,
        isExactFit: c.isExactFit,
        notes: c.notes,
        replacementKm: c.replacementKm,
        replacementKmMax: c.replacementKmMax,
        replacementMonths: c.replacementMonths,
        vehicle: mapVehicleSummary(c.vehicle),
      })),
    };
  }

  async create(dto: CreateProductDto): Promise<ProductDetail> {
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug) : await this.uniqueSlug(dto.name);

    const row = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        sku: dto.sku,
        description: dto.description,
        shortDescription: dto.shortDescription,
        technicalCode: dto.technicalCode,
        oemCodes: dto.oemCodes ?? [],
        aliases: dto.aliases ?? [],
        keywords: dto.keywords ?? [],
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        mainImageUrl: dto.mainImageUrl,
        images: dto.images ?? [],
        specifications: dto.specifications ?? {},
        retailPrice: dto.retailPrice,
        compareAtPrice: dto.compareAtPrice,
        minWholesaleQty: dto.minWholesaleQty ?? 1,
        stockQuantity: dto.stockQuantity ?? 0,
        replacementKm: dto.replacementKm,
        replacementKmMax: dto.replacementKmMax,
        replacementMonths: dto.replacementMonths,
        replacementNotes: dto.replacementNotes,
        isActive: dto.isActive ?? true,
        isManufactured: dto.isManufactured ?? false,
        isFeatured: dto.isFeatured ?? false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ...(dto.wholesaleTiers
          ? {
              wholesaleRules: {
                create: dto.wholesaleTiers.map((t) => ({
                  minQuantity: t.minQuantity,
                  maxQuantity: t.maxQuantity ?? null,
                  unitPrice: t.unitPrice,
                })),
              },
            }
          : {}),
      },
      select: productDetailSelect,
    });
    return mapProductDetail(row);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('محصول یافت نشد.');

    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug, id) : undefined;

    const row = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.shortDescription !== undefined ? { shortDescription: dto.shortDescription } : {}),
        ...(dto.technicalCode !== undefined ? { technicalCode: dto.technicalCode } : {}),
        ...(dto.oemCodes !== undefined ? { oemCodes: dto.oemCodes } : {}),
        ...(dto.aliases !== undefined ? { aliases: dto.aliases } : {}),
        ...(dto.keywords !== undefined ? { keywords: dto.keywords } : {}),
        ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.mainImageUrl !== undefined ? { mainImageUrl: dto.mainImageUrl } : {}),
        ...(dto.images !== undefined ? { images: dto.images } : {}),
        ...(dto.specifications !== undefined ? { specifications: dto.specifications } : {}),
        ...(dto.retailPrice !== undefined ? { retailPrice: dto.retailPrice } : {}),
        ...(dto.compareAtPrice !== undefined ? { compareAtPrice: dto.compareAtPrice } : {}),
        ...(dto.minWholesaleQty !== undefined ? { minWholesaleQty: dto.minWholesaleQty } : {}),
        ...(dto.stockQuantity !== undefined ? { stockQuantity: dto.stockQuantity } : {}),
        ...(dto.replacementKm !== undefined ? { replacementKm: dto.replacementKm } : {}),
        ...(dto.replacementKmMax !== undefined ? { replacementKmMax: dto.replacementKmMax } : {}),
        ...(dto.replacementMonths !== undefined ? { replacementMonths: dto.replacementMonths } : {}),
        ...(dto.replacementNotes !== undefined ? { replacementNotes: dto.replacementNotes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isManufactured !== undefined ? { isManufactured: dto.isManufactured } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
        ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
        // Rule 2 — a full tier list replaces the previous one; there is no
        // per-tier PATCH, the same way the admin form edits the whole table.
        ...(dto.wholesaleTiers !== undefined
          ? {
              wholesaleRules: {
                deleteMany: {},
                create: dto.wholesaleTiers.map((t) => ({
                  minQuantity: t.minQuantity,
                  maxQuantity: t.maxQuantity ?? null,
                  unitPrice: t.unitPrice,
                })),
              },
            }
          : {}),
      },
      select: productDetailSelect,
    });
    return mapProductDetail(row);
  }

  /**
   * "Delete" deactivates rather than removing the row. `OrderItem.productId`
   * has no cascade — a hard delete would throw the moment the product ever
   * appeared in a real order — and hiding it from `catalog()` (which already
   * filters `isActive: true`) is exactly what "remove from the storefront"
   * needs. Documented in claude/وضعیت-پیاده‌سازی.md, فاز ۹الف.
   */
  async deactivate(id: string): Promise<void> {
    try {
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('محصول یافت نشد.');
      }
      throw error;
    }
  }

  /** PRD §46/Rule 3 — a real relation row, not free text. */
  async addCompatibility(productId: string, dto: CreateCompatibilityDto) {
    const [product, vehicle] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
    ]);
    if (!product) throw new NotFoundException('محصول یافت نشد.');
    if (!vehicle) throw new NotFoundException('خودرو یافت نشد.');

    try {
      return await this.prisma.productVehicleCompatibility.create({
        data: {
          productId,
          vehicleId: dto.vehicleId,
          isExactFit: dto.isExactFit ?? true,
          notes: dto.notes,
          replacementKm: dto.replacementKm,
          replacementKmMax: dto.replacementKmMax,
          replacementMonths: dto.replacementMonths,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new NotFoundException('این محصول از قبل برای این خودرو ثبت شده است.');
      }
      throw error;
    }
  }

  async updateCompatibility(id: string, dto: UpdateCompatibilityDto) {
    try {
      return await this.prisma.productVehicleCompatibility.update({
        where: { id },
        data: {
          ...(dto.isExactFit !== undefined ? { isExactFit: dto.isExactFit } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.replacementKm !== undefined ? { replacementKm: dto.replacementKm } : {}),
          ...(dto.replacementKmMax !== undefined ? { replacementKmMax: dto.replacementKmMax } : {}),
          ...(dto.replacementMonths !== undefined ? { replacementMonths: dto.replacementMonths } : {}),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('رکورد سازگاری یافت نشد.');
      }
      throw error;
    }
  }

  /** Hard delete — a pure join row, nothing downstream references it. */
  async removeCompatibility(id: string): Promise<void> {
    try {
      await this.prisma.productVehicleCompatibility.delete({ where: { id } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('رکورد سازگاری یافت نشد.');
      }
      throw error;
    }
  }
}
