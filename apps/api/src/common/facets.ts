import type { Prisma } from '@prisma/client';
import type { SearchFacets } from '@edalat/shared';

import type { PrismaService } from '../prisma/prisma.service';

/**
 * Facet counts for a filtered product set, used by both the catalog and
 * `/search` so the two never disagree about how many products a brand has.
 *
 * Three aggregate queries, no per-row work: `groupBy` on brand and category,
 * plus one `aggregate` for the price bounds. Names are resolved in two extra
 * `findMany` calls over the distinct ids — bounded by the number of brands and
 * categories, not by the number of products, so this stays O(1) in catalog size.
 */
export async function buildFacets(
  prisma: PrismaService,
  where: Prisma.ProductWhereInput,
): Promise<SearchFacets> {
  const [brandGroups, categoryGroups, priceAgg] = await Promise.all([
    prisma.product.groupBy({
      by: ['brandId'],
      where,
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ['categoryId'],
      where,
      _count: { _all: true },
    }),
    prisma.product.aggregate({
      where,
      _min: { retailPrice: true },
      _max: { retailPrice: true },
    }),
  ]);

  const brandIds = brandGroups.map((g) => g.brandId).filter((id): id is string => id !== null);
  const categoryIds = categoryGroups
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);

  const [brands, categories] = await Promise.all([
    brandIds.length
      ? prisma.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    categoryIds.length
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  const brandCount = new Map(brandGroups.map((g) => [g.brandId, g._count._all]));
  const categoryCount = new Map(categoryGroups.map((g) => [g.categoryId, g._count._all]));

  return {
    brands: brands
      .map((b) => ({ ...b, count: brandCount.get(b.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fa')),
    categories: categories
      .map((c) => ({ ...c, count: categoryCount.get(c.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fa')),
    priceRange: {
      min: Number(priceAgg._min.retailPrice ?? 0),
      max: Number(priceAgg._max.retailPrice ?? 0),
    },
  };
}
