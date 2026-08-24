import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  ProductSummary,
  SearchResponse,
  SearchResultItem,
  SearchSuggestion,
} from '@edalat/shared';
import {
  SearchMatchKind,
  SuggestionKind,
  looksLikeCode,
  normalizeCode,
  normalizePersian,
} from '@edalat/shared';

import { mapProductSummary, productSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

/** PRD §40 — ranking weights, highest first. */
const SCORE: Record<SearchMatchKind, number> = {
  EXACT_TECHNICAL_CODE: 1000,
  EXACT_OEM_CODE: 900,
  EXACT_PRODUCT_NAME: 800,
  VEHICLE_COMPATIBILITY: 600,
  BRAND: 400,
  CATEGORY: 300,
  PARTIAL: 200,
  DESCRIPTION: 100,
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Multi-field search over products (PRD §39).
   *
   * The strategy is deliberately bucketed rather than one big OR: each bucket
   * carries a different rank, so an exact part-number hit can never be buried
   * under a fuzzy name match. Buckets are evaluated cheapest-first and merged
   * by product id, keeping the highest score seen.
   */
  async search(dto: SearchQueryDto): Promise<SearchResponse> {
    const raw = dto.q ?? '';
    const normalized = normalizePersian(raw);
    const code = normalizeCode(raw);
    const isCodeLike = looksLikeCode(raw);

    const scored = new Map<string, { row: any; kind: SearchMatchKind; score: number }>();
    const remember = (row: any, kind: SearchMatchKind) => {
      const existing = scored.get(row.id);
      if (!existing || SCORE[kind] > existing.score) {
        scored.set(row.id, { row, kind, score: SCORE[kind] });
      }
    };

    const baseWhere: Prisma.ProductWhereInput = { isActive: true };
    if (dto.brandId) baseWhere.brandId = dto.brandId;
    if (dto.categoryId) baseWhere.categoryId = dto.categoryId;
    if (dto.vehicleId) baseWhere.compatibilities = { some: { vehicleId: dto.vehicleId } };
    if (dto.inStock) baseWhere.stockQuantity = { gt: 0 };
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      baseWhere.retailPrice = {
        ...(dto.minPrice !== undefined ? { gte: dto.minPrice } : {}),
        ...(dto.maxPrice !== undefined ? { lte: dto.maxPrice } : {}),
      };
    }
    if (dto.purchaseType === 'WHOLESALE') baseWhere.wholesaleRules = { some: {} };

    let exactCodeMatchId: string | null = null;

    if (normalized.length > 0) {
      // ---- Bucket 1 & 2: exact technical / OEM code -----------------------
      if (isCodeLike || code.length >= 4) {
        const codeMatches = await this.prisma.product.findMany({
          where: {
            ...baseWhere,
            OR: [{ technicalCode: { equals: code, mode: 'insensitive' } }, { oemCodes: { has: code } }],
          },
          select: productSummarySelect,
          take: 20,
        });
        for (const row of codeMatches) {
          const isOwnCode = normalizeCode(row.technicalCode ?? '') === code;
          remember(row, isOwnCode ? SearchMatchKind.EXACT_TECHNICAL_CODE : SearchMatchKind.EXACT_OEM_CODE);
          if (isOwnCode && !exactCodeMatchId) exactCodeMatchId = row.id;
        }
      }

      // ---- Bucket 3: exact product name -----------------------------------
      const nameExact = await this.prisma.product.findMany({
        where: { ...baseWhere, name: { equals: normalized, mode: 'insensitive' } },
        select: productSummarySelect,
        take: 20,
      });
      nameExact.forEach((row) => remember(row, SearchMatchKind.EXACT_PRODUCT_NAME));

      // ---- Bucket 4: vehicle compatibility ---------------------------------
      // "فیلتر روغن پژو 206" — the vehicle words in the query point at a car,
      // and its compatible parts are strong candidates.
      const tokens = normalized.split(' ').filter((t) => t.length >= 2);
      if (tokens.length > 1) {
        const vehicleMatches = await this.prisma.product.findMany({
          where: {
            ...baseWhere,
            AND: [
              {
                compatibilities: {
                  some: {
                    vehicle: {
                      OR: tokens.flatMap((t) => [
                        { model: { contains: t, mode: 'insensitive' as const } },
                        { brand: { name: { contains: t, mode: 'insensitive' as const } } },
                        { engine: { contains: t, mode: 'insensitive' as const } },
                      ]),
                    },
                  },
                },
              },
              {
                OR: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })),
              },
            ],
          },
          select: productSummarySelect,
          take: 40,
        });
        vehicleMatches.forEach((row) => remember(row, SearchMatchKind.VEHICLE_COMPATIBILITY));
      }

      // ---- Bucket 5/6: brand and category ----------------------------------
      const brandOrCategory = await this.prisma.product.findMany({
        where: {
          ...baseWhere,
          OR: [
            { brand: { name: { contains: normalized, mode: 'insensitive' } } },
            { category: { name: { contains: normalized, mode: 'insensitive' } } },
          ],
        },
        select: productSummarySelect,
        take: 40,
      });
      for (const row of brandOrCategory) {
        const brandHit = normalizePersian(row.brand?.name ?? '').includes(normalized);
        remember(row, brandHit ? SearchMatchKind.BRAND : SearchMatchKind.CATEGORY);
      }

      // ---- Bucket 7: partial name / alias / keyword ------------------------
      const partial = await this.prisma.product.findMany({
        where: {
          ...baseWhere,
          OR: [
            { name: { contains: normalized, mode: 'insensitive' } },
            { sku: { contains: code, mode: 'insensitive' } },
            { technicalCode: { contains: code, mode: 'insensitive' } },
            { aliases: { hasSome: tokens } },
            { keywords: { hasSome: tokens } },
          ],
        },
        select: productSummarySelect,
        take: 60,
      });
      partial.forEach((row) => remember(row, SearchMatchKind.PARTIAL));

      // ---- Bucket 8: description ------------------------------------------
      if (scored.size < 5) {
        const inDescription = await this.prisma.product.findMany({
          where: { ...baseWhere, description: { contains: normalized, mode: 'insensitive' } },
          select: productSummarySelect,
          take: 20,
        });
        inDescription.forEach((row) => remember(row, SearchMatchKind.DESCRIPTION));
      }
    } else {
      // No query: behave like a plain catalog listing.
      const rows = await this.prisma.product.findMany({
        where: baseWhere,
        select: productSummarySelect,
        orderBy: [{ isFeatured: 'desc' }, { salesCount: 'desc' }],
        take: 100,
      });
      rows.forEach((row) => remember(row, SearchMatchKind.PARTIAL));
    }

    const all: SearchResultItem[] = [...scored.values()]
      .sort((a, b) => b.score - a.score || b.row.salesCount - a.row.salesCount)
      .map(({ row, kind, score }) => ({ ...mapProductSummary(row), matchKind: kind, score }));

    const total = all.length;
    const start = (dto.page - 1) * dto.pageSize;
    const items = all.slice(start, start + dto.pageSize);

    // PRD §68 — log every query, especially the ones that found nothing.
    void this.prisma.searchQueryLog
      .create({
        data: {
          rawQuery: raw,
          normalizedQuery: normalized,
          resultCount: total,
          source: dto.source ?? 'TEXT',
          vehicleId: dto.vehicleId ?? null,
          sessionKey: dto.sessionKey ?? null,
        },
      })
      .catch(() => undefined);

    return {
      items,
      page: dto.page,
      pageSize: dto.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.pageSize)),
      normalizedQuery: normalized,
      exactCodeMatchId,
      facets: SearchService.buildFacets(all),
    };
  }

  private static buildFacets(items: ProductSummary[]): SearchResponse['facets'] {
    const brands = new Map<string, { id: string; name: string; count: number }>();
    const categories = new Map<string, { id: string; name: string; count: number }>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const item of items) {
      if (item.brand) {
        const entry = brands.get(item.brand.id) ?? { id: item.brand.id, name: item.brand.name, count: 0 };
        entry.count += 1;
        brands.set(item.brand.id, entry);
      }
      if (item.category) {
        const entry =
          categories.get(item.category.id) ?? { id: item.category.id, name: item.category.name, count: 0 };
        entry.count += 1;
        categories.set(item.category.id, entry);
      }
      min = Math.min(min, item.retailPrice);
      max = Math.max(max, item.retailPrice);
    }

    return {
      brands: [...brands.values()].sort((a, b) => b.count - a.count),
      categories: [...categories.values()].sort((a, b) => b.count - a.count),
      vehicleBrands: [],
      priceRange: { min: Number.isFinite(min) ? min : 0, max },
    };
  }

  /** PRD §9 — type-ahead across products, vehicles, brands and categories. */
  async suggest(query: string, limit = 8): Promise<SearchSuggestion[]> {
    const q = normalizePersian(query);
    if (q.length < 2) return [];

    const [products, vehicles, brands, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { technicalCode: { contains: normalizeCode(query), mode: 'insensitive' } },
          ],
        },
        select: { name: true, slug: true, mainImageUrl: true, technicalCode: true },
        take: limit,
      }),
      this.prisma.vehicle.findMany({
        where: { isActive: true, OR: [{ model: { contains: q, mode: 'insensitive' } }] },
        select: { model: true, slug: true, engine: true, brand: { select: { name: true } } },
        take: 4,
      }),
      this.prisma.brand.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        select: { name: true, slug: true, logoUrl: true },
        take: 3,
      }),
      this.prisma.category.findMany({
        where: { isActive: true, name: { contains: q, mode: 'insensitive' } },
        select: { name: true, slug: true },
        take: 3,
      }),
    ]);

    return [
      ...products.map((p) => ({
        kind: SuggestionKind.PRODUCT,
        label: p.name,
        href: `/products/${p.slug}`,
        imageUrl: p.mainImageUrl,
      })),
      ...vehicles.map((v) => ({
        kind: SuggestionKind.VEHICLE,
        label: [v.brand.name, v.model, v.engine].filter(Boolean).join(' '),
        href: `/vehicles/${v.slug}`,
      })),
      ...brands.map((b) => ({
        kind: SuggestionKind.BRAND,
        label: b.name,
        href: `/brands/${b.slug}`,
        imageUrl: b.logoUrl,
      })),
      ...categories.map((c) => ({
        kind: SuggestionKind.CATEGORY,
        label: c.name,
        href: `/categories/${c.slug}`,
      })),
    ].slice(0, limit + 6);
  }

  /** PRD §68 — what customers looked for and did not find. */
  async zeroResultQueries(limit = 50) {
    return this.prisma.searchQueryLog.groupBy({
      by: ['normalizedQuery'],
      where: { resultCount: 0 },
      _count: { normalizedQuery: true },
      orderBy: { _count: { normalizedQuery: 'desc' } },
      take: limit,
    });
  }
}
