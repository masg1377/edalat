import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SearchResponse, SearchResultItem } from '@edalat/shared';
import {
  SearchMatchKind,
  SuggestionKind,
  buildPagination,
  looksLikeCode,
  normalizeCode,
  normalizePersian,
  type SearchSuggestion,
} from '@edalat/shared';

import { buildFacets } from '../../common/facets';
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

/** What a ranking pass produces: an ordered id list plus per-id provenance. */
export interface RankedProducts {
  normalizedQuery: string;
  /** Product ids, best match first. */
  ids: string[];
  ranks: Map<string, { matchKind: SearchMatchKind; score: number }>;
  /** Set when the query was a technical code that matched a product exactly. */
  exactCodeMatchId: string | null;
}

/** Minimal projection — ranking only needs identity and tie-breakers. */
const rankSelect = {
  id: true,
  technicalCode: true,
  salesCount: true,
  brand: { select: { name: true } },
} as const;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The single implementation of search ranking (PRD §39–§40).
   *
   * Both `/search` and the product catalog call this; neither re-implements
   * matching. The strategy is deliberately bucketed rather than one big OR:
   * each bucket carries a different rank, so an exact part-number hit can never
   * be buried under a fuzzy name match. Buckets are merged by product id,
   * keeping the highest score seen.
   *
   * `scope` is ANDed into every bucket, so the caller's filters (category,
   * brand, vehicle, price, availability) constrain the ranked set directly —
   * there is no second filtering pass to keep in sync.
   */
  async rankProductIds(
    rawQuery: string,
    scope: Prisma.ProductWhereInput = {},
  ): Promise<RankedProducts> {
    const normalized = normalizePersian(rawQuery);
    const code = normalizeCode(rawQuery);
    const isCodeLike = looksLikeCode(rawQuery);

    const ranks = new Map<string, { matchKind: SearchMatchKind; score: number }>();
    const salesById = new Map<string, number>();
    let exactCodeMatchId: string | null = null;

    const remember = (row: { id: string; salesCount: number }, kind: SearchMatchKind) => {
      salesById.set(row.id, row.salesCount);
      const existing = ranks.get(row.id);
      if (!existing || SCORE[kind] > existing.score) {
        ranks.set(row.id, { matchKind: kind, score: SCORE[kind] });
      }
    };

    const withBase = (extra: Prisma.ProductWhereInput): Prisma.ProductWhereInput => ({
      AND: [{ isActive: true }, scope, extra],
    });

    if (normalized.length === 0) {
      return { normalizedQuery: '', ids: [], ranks, exactCodeMatchId };
    }

    const tokens = normalized.split(' ').filter((token) => token.length >= 2);

    // ---- Buckets 1 & 2: exact technical / OEM code ------------------------
    if (isCodeLike || code.length >= 4) {
      const codeMatches = await this.prisma.product.findMany({
        where: withBase({
          OR: [{ technicalCode: { equals: code, mode: 'insensitive' } }, { oemCodes: { has: code } }],
        }),
        select: rankSelect,
        take: 20,
      });
      for (const row of codeMatches) {
        const isOwnCode = normalizeCode(row.technicalCode ?? '') === code;
        remember(
          row,
          isOwnCode ? SearchMatchKind.EXACT_TECHNICAL_CODE : SearchMatchKind.EXACT_OEM_CODE,
        );
        if (isOwnCode && !exactCodeMatchId) exactCodeMatchId = row.id;
      }
    }

    // ---- Bucket 3: exact product name -------------------------------------
    const nameExact = await this.prisma.product.findMany({
      where: withBase({ name: { equals: normalized, mode: 'insensitive' } }),
      select: rankSelect,
      take: 20,
    });
    nameExact.forEach((row) => remember(row, SearchMatchKind.EXACT_PRODUCT_NAME));

    // ---- Bucket 4: vehicle compatibility ----------------------------------
    // "فیلتر روغن پژو 206" — some tokens name a car, the rest name a part.
    // Requiring both keeps this bucket from swallowing every part of that car.
    if (tokens.length > 1) {
      const vehicleMatches = await this.prisma.product.findMany({
        where: withBase({
          AND: [
            {
              compatibilities: {
                some: {
                  vehicle: {
                    OR: tokens.flatMap((token) => [
                      { model: { contains: token, mode: 'insensitive' as const } },
                      { brand: { name: { contains: token, mode: 'insensitive' as const } } },
                      { engine: { contains: token, mode: 'insensitive' as const } },
                    ]),
                  },
                },
              },
            },
            { OR: tokens.map((token) => ({ name: { contains: token, mode: 'insensitive' as const } })) },
          ],
        }),
        select: rankSelect,
        take: 60,
      });
      vehicleMatches.forEach((row) => remember(row, SearchMatchKind.VEHICLE_COMPATIBILITY));
    }

    // ---- Buckets 5 & 6: brand and category --------------------------------
    const brandOrCategory = await this.prisma.product.findMany({
      where: withBase({
        OR: [
          { brand: { name: { contains: normalized, mode: 'insensitive' } } },
          { category: { name: { contains: normalized, mode: 'insensitive' } } },
        ],
      }),
      select: rankSelect,
      take: 60,
    });
    for (const row of brandOrCategory) {
      const brandHit = normalizePersian(row.brand?.name ?? '').includes(normalized);
      remember(row, brandHit ? SearchMatchKind.BRAND : SearchMatchKind.CATEGORY);
    }

    // ---- Bucket 7: partial name / code / alias / keyword -------------------
    // A Persian-only query normalizes to an EMPTY part code, and
    // `contains: ''` is `LIKE '%%'` — it matches every row. Guard the
    // code clauses so prose queries never fall through to a match-all.
    const codeClauses =
      code.length >= 3
        ? [
            { sku: { contains: code, mode: 'insensitive' as const } },
            { technicalCode: { contains: code, mode: 'insensitive' as const } },
          ]
        : [];

    const partial = await this.prisma.product.findMany({
      where: withBase({
        OR: [
          { name: { contains: normalized, mode: 'insensitive' } },
          ...codeClauses,
          // `hasEvery`, not `hasSome`: every product carries the token "فیلتر"
          // in its keywords, so matching on any single token would make an
          // absent part like "فیلتر ناموجود" return the whole catalogue.
          ...(tokens.length > 0
            ? [{ aliases: { hasEvery: tokens } }, { keywords: { hasEvery: tokens } }]
            : []),
        ],
      }),
      select: rankSelect,
      take: 100,
    });
    partial.forEach((row) => remember(row, SearchMatchKind.PARTIAL));

    // ---- Bucket 8: description (only when the query is starved) -----------
    if (ranks.size < 5) {
      const inDescription = await this.prisma.product.findMany({
        where: withBase({ description: { contains: normalized, mode: 'insensitive' } }),
        select: rankSelect,
        take: 20,
      });
      inDescription.forEach((row) => remember(row, SearchMatchKind.DESCRIPTION));
    }

    const ids = [...ranks.entries()]
      .sort(
        ([idA, a], [idB, b]) =>
          b.score - a.score || (salesById.get(idB) ?? 0) - (salesById.get(idA) ?? 0),
      )
      .map(([id]) => id);

    return { normalizedQuery: normalized, ids, ranks, exactCodeMatchId };
  }

  /** Records what customers looked for — especially what they did not find. */
  async logQuery(input: {
    rawQuery: string;
    normalizedQuery: string;
    resultCount: number;
    source?: string;
    vehicleId?: string | null;
    sessionKey?: string | null;
  }): Promise<void> {
    // Analytics must never break a search response, so failures are swallowed.
    await this.prisma.searchQueryLog
      .create({
        data: {
          rawQuery: input.rawQuery,
          normalizedQuery: input.normalizedQuery,
          resultCount: input.resultCount,
          source: input.source ?? 'TEXT',
          vehicleId: input.vehicleId ?? null,
          sessionKey: input.sessionKey ?? null,
        },
      })
      .catch(() => undefined);
  }

  /**
   * `/search` — ranked results with match provenance. The catalog uses
   * `rankProductIds` directly instead, because it needs to apply its own
   * sorting and pagination on top.
   */
  async search(dto: SearchQueryDto): Promise<SearchResponse> {
    const scope: Prisma.ProductWhereInput = {};
    if (dto.brandId) scope.brandId = dto.brandId;
    if (dto.categoryId) scope.categoryId = dto.categoryId;
    if (dto.vehicleId) scope.compatibilities = { some: { vehicleId: dto.vehicleId } };
    if (dto.inStock) scope.stockQuantity = { gt: 0 };
    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      scope.retailPrice = {
        ...(dto.minPrice !== undefined ? { gte: dto.minPrice } : {}),
        ...(dto.maxPrice !== undefined ? { lte: dto.maxPrice } : {}),
      };
    }
    if (dto.purchaseType === 'WHOLESALE') scope.wholesaleRules = { some: {} };

    const ranked = await this.rankProductIds(dto.q ?? '', scope);

    const total = ranked.ids.length;
    const start = (dto.page - 1) * dto.limit;
    const pageIds = ranked.ids.slice(start, start + dto.limit);

    const rows =
      pageIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: pageIds } },
            select: productSummarySelect,
          })
        : [];

    // `findMany` does not preserve the order of an `in` clause, so re-apply it.
    const byId = new Map(rows.map((row) => [row.id, row]));
    const items: SearchResultItem[] = pageIds.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const rank = ranked.ranks.get(id)!;
      return [{ ...mapProductSummary(row), matchKind: rank.matchKind, score: rank.score }];
    });

    void this.logQuery({
      rawQuery: dto.q ?? '',
      normalizedQuery: ranked.normalizedQuery,
      resultCount: total,
      source: dto.source,
      vehicleId: dto.vehicleId,
      sessionKey: dto.sessionKey,
    });

    // Facets describe the whole ranked set, not just the current page.
    const facets = await buildFacets(
      this.prisma,
      ranked.ids.length > 0 ? { id: { in: ranked.ids } } : { id: { in: [] } },
    );

    return {
      items,
      pagination: buildPagination(dto.page, dto.limit, total),
      normalizedQuery: ranked.normalizedQuery,
      exactCodeMatchId: ranked.exactCodeMatchId,
      facets,
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
        where: { isActive: true, model: { contains: q, mode: 'insensitive' } },
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
        href: `/products?category=${c.slug}`,
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
