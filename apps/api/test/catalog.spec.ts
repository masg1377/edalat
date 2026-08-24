import { plainToInstance } from 'class-transformer';
import { CatalogSort, PurchaseType, SearchMatchKind } from '@edalat/shared';

import { PrismaService } from '../src/prisma/prisma.service';
import { SearchService } from '../src/modules/search/search.service';
import { ProductsService } from '../src/modules/products/products.service';
import { CatalogQueryDto } from '../src/modules/products/dto/catalog-query.dto';

/**
 * Catalog integration tests against a real PostgreSQL.
 *
 * These deliberately exercise Prisma rather than a mock: the thing worth
 * testing here is whether the generated SQL actually filters, sorts and pages
 * the way the catalog claims, and a mocked client would assert nothing about
 * that. Every fixture is namespaced with a unique prefix and removed in
 * `afterAll`, so runs are isolated from seed data and from each other.
 */

const PREFIX = `test-catalog-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const search = new SearchService(prisma);
const products = new ProductsService(prisma, search);

/** Builds the DTO exactly as the ValidationPipe would, defaults included. */
function query(params: Record<string, unknown> = {}): CatalogQueryDto {
  return plainToInstance(CatalogQueryDto, { page: 1, limit: 24, ...params }, {
    enableImplicitConversion: true,
  });
}

let oilCategoryId = '';
let airCategoryId = '';
let houseBrandId = '';
let otherBrandId = '';
let peugeotVehicleId = '';
let samandVehicleId = '';

/** Only ever assert over fixtures this run created. */
const onlyOurs = <T extends { slug: string }>(items: T[]) =>
  items.filter((item) => item.slug.startsWith(PREFIX));

beforeAll(async () => {
  const [oil, air] = await Promise.all([
    prisma.category.create({ data: { name: `${PREFIX} فیلتر روغن`, slug: slug('oil') } }),
    prisma.category.create({ data: { name: `${PREFIX} فیلتر هوا`, slug: slug('air') } }),
  ]);
  oilCategoryId = oil.id;
  airCategoryId = air.id;

  const [house, other] = await Promise.all([
    prisma.brand.create({ data: { name: `${PREFIX} عدالت`, slug: slug('house') } }),
    prisma.brand.create({ data: { name: `${PREFIX} دیگر`, slug: slug('other') } }),
  ]);
  houseBrandId = house.id;
  otherBrandId = other.id;

  const vehicleBrand = await prisma.vehicleBrand.create({
    data: { name: `${PREFIX} ایران خودرو`, slug: slug('ikco') },
  });
  const [peugeot, samand] = await Promise.all([
    prisma.vehicle.create({
      data: { slug: slug('206'), brandId: vehicleBrand.id, model: 'پژو ۲۰۶', engine: 'TU5' },
    }),
    prisma.vehicle.create({
      data: { slug: slug('samand'), brandId: vehicleBrand.id, model: 'سمند', engine: 'EF7' },
    }),
  ]);
  peugeotVehicleId = peugeot.id;
  samandVehicleId = samand.id;

  // Four products spanning every dimension the catalog filters on.
  await prisma.product.create({
    data: {
      slug: slug('cheap-oil'),
      name: `${PREFIX} فیلتر روغن ارزان`,
      sku: slug('sku-1'),
      technicalCode: 'TESTOIL001',
      categoryId: oilCategoryId,
      brandId: houseBrandId,
      retailPrice: 100_000,
      stockQuantity: 10,
      minWholesaleQty: 20,
      wholesaleRules: {
        create: [
          { minQuantity: 20, maxQuantity: 49, unitPrice: 80_000 },
          { minQuantity: 50, maxQuantity: null, unitPrice: 70_000 },
        ],
      },
      compatibilities: { create: [{ vehicleId: peugeotVehicleId }] },
    },
  });

  await prisma.product.create({
    data: {
      slug: slug('mid-oil'),
      name: `${PREFIX} فیلتر روغن متوسط`,
      sku: slug('sku-2'),
      technicalCode: 'TESTOIL002',
      categoryId: oilCategoryId,
      brandId: otherBrandId,
      retailPrice: 300_000,
      stockQuantity: 0, // out of stock
      compatibilities: { create: [{ vehicleId: samandVehicleId }] },
    },
  });

  await prisma.product.create({
    data: {
      slug: slug('expensive-air'),
      name: `${PREFIX} فیلتر هوا گران`,
      sku: slug('sku-3'),
      technicalCode: 'TESTAIR003',
      categoryId: airCategoryId,
      brandId: houseBrandId,
      retailPrice: 900_000,
      stockQuantity: 5,
      compatibilities: {
        create: [{ vehicleId: peugeotVehicleId }, { vehicleId: samandVehicleId }],
      },
    },
  });

  await prisma.product.create({
    data: {
      slug: slug('inactive'),
      name: `${PREFIX} محصول غیرفعال`,
      sku: slug('sku-4'),
      technicalCode: 'TESTOFF004',
      categoryId: airCategoryId,
      brandId: houseBrandId,
      retailPrice: 50_000,
      stockQuantity: 99,
      isActive: false,
    },
  });
});

afterAll(async () => {
  // Children first — compatibility and price rules reference products.
  await prisma.productVehicleCompatibility.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await prisma.wholesalePriceRule.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicle.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicleBrand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.searchQueryLog.deleteMany({ where: { rawQuery: { contains: PREFIX } } });
  await prisma.$disconnect();
});

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

describe('catalog — filtering', () => {
  it('excludes inactive products from every result', async () => {
    const result = await products.catalog(query({ limit: 100 }));
    expect(result.items.some((item) => item.slug === slug('inactive'))).toBe(false);
  });

  it('filters by category slug', async () => {
    const result = await products.catalog(query({ category: slug('oil'), limit: 100 }));
    const ours = onlyOurs(result.items);
    expect(ours.map((i) => i.slug).sort()).toEqual([slug('cheap-oil'), slug('mid-oil')].sort());
  });

  it('filters by brand slug', async () => {
    const result = await products.catalog(query({ brand: slug('other'), limit: 100 }));
    expect(onlyOurs(result.items).map((i) => i.slug)).toEqual([slug('mid-oil')]);
  });

  it('filters by vehicle through the compatibility relation', async () => {
    const result = await products.catalog(query({ vehicleId: peugeotVehicleId, limit: 100 }));
    expect(onlyOurs(result.items).map((i) => i.slug).sort()).toEqual(
      [slug('cheap-oil'), slug('expensive-air')].sort(),
    );
  });

  it('filters by availability', async () => {
    const result = await products.catalog(query({ inStock: true, limit: 100 }));
    const slugs = onlyOurs(result.items).map((i) => i.slug);
    expect(slugs).toContain(slug('cheap-oil'));
    expect(slugs).not.toContain(slug('mid-oil')); // stock 0
  });

  it('filters by price range', async () => {
    const result = await products.catalog(
      query({ minPrice: 200_000, maxPrice: 400_000, limit: 100 }),
    );
    expect(onlyOurs(result.items).map((i) => i.slug)).toEqual([slug('mid-oil')]);
  });

  it('combines filters conjunctively', async () => {
    const result = await products.catalog(
      query({ category: slug('oil'), brand: slug('house'), limit: 100 }),
    );
    expect(onlyOurs(result.items).map((i) => i.slug)).toEqual([slug('cheap-oil')]);
  });

  it('returns only products with a wholesale rule when purchaseType is WHOLESALE', async () => {
    const result = await products.catalog(
      query({ purchaseType: PurchaseType.WHOLESALE, limit: 100 }),
    );
    const ours = onlyOurs(result.items);
    expect(ours.map((i) => i.slug)).toEqual([slug('cheap-oil')]);
    expect(ours[0].lowestWholesalePrice).toBe(70_000);
    expect(ours[0].minWholesaleQuantity).toBe(20);
  });

  it('leaves wholesale display fields null when no tier exists', async () => {
    const result = await products.catalog(query({ brand: slug('other'), limit: 100 }));
    expect(result.items[0].lowestWholesalePrice).toBeNull();
    expect(result.items[0].minWholesaleQuantity).toBeNull();
  });

  it('reports the compatible vehicle count without shipping the vehicle list', async () => {
    const result = await products.catalog(query({ category: slug('air'), limit: 100 }));
    const air = onlyOurs(result.items).find((i) => i.slug === slug('expensive-air'))!;
    expect(air.compatibleVehicleCount).toBe(2);
    expect(air).not.toHaveProperty('compatibleVehicles');
    expect(air).not.toHaveProperty('specifications');
  });
});

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

describe('catalog — sorting', () => {
  it('sorts by price ascending', async () => {
    const result = await products.catalog(
      query({ category: slug('oil'), sort: CatalogSort.PRICE_ASC, limit: 100 }),
    );
    const prices = onlyOurs(result.items).map((i) => i.retailPrice);
    expect(prices).toEqual([100_000, 300_000]);
  });

  it('sorts by price descending', async () => {
    const result = await products.catalog(
      query({ category: slug('oil'), sort: CatalogSort.PRICE_DESC, limit: 100 }),
    );
    const prices = onlyOurs(result.items).map((i) => i.retailPrice);
    expect(prices).toEqual([300_000, 100_000]);
  });

  it('applies a column sort on top of a text query', async () => {
    const result = await products.catalog(
      query({ q: `${PREFIX} فیلتر`, sort: CatalogSort.PRICE_DESC, limit: 100 }),
    );
    const prices = onlyOurs(result.items).map((i) => i.retailPrice);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(prices.length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

describe('catalog — pagination', () => {
  it('reports totals that match the filtered set, not the page', async () => {
    const result = await products.catalog(query({ category: slug('oil'), limit: 1 }));
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('sets hasNext / hasPrevious at the boundaries', async () => {
    const first = await products.catalog(query({ category: slug('oil'), limit: 1, page: 1 }));
    expect(first.pagination.hasPrevious).toBe(false);
    expect(first.pagination.hasNext).toBe(true);

    const last = await products.catalog(query({ category: slug('oil'), limit: 1, page: 2 }));
    expect(last.pagination.hasPrevious).toBe(true);
    expect(last.pagination.hasNext).toBe(false);
  });

  it('returns disjoint pages', async () => {
    const [first, second] = await Promise.all([
      products.catalog(query({ category: slug('oil'), sort: CatalogSort.PRICE_ASC, limit: 1, page: 1 })),
      products.catalog(query({ category: slug('oil'), sort: CatalogSort.PRICE_ASC, limit: 1, page: 2 })),
    ]);
    expect(first.items[0].id).not.toBe(second.items[0].id);
  });

  it('returns an empty page past the end without failing', async () => {
    const result = await products.catalog(query({ category: slug('oil'), limit: 10, page: 99 }));
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.hasNext).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Search integration                                                  */
/* ------------------------------------------------------------------ */

describe('catalog — search', () => {
  it('keeps exact technical-code ranking when searching through the catalog', async () => {
    const result = await products.catalog(query({ q: 'TESTAIR003' }));
    expect(result.items[0].slug).toBe(slug('expensive-air'));
    expect(result.exactCodeMatchId).toBe(result.items[0].id);
  });

  it('matches a technical code regardless of separators or case', async () => {
    const result = await products.catalog(query({ q: 'testair-003' }));
    expect(result.items[0]?.slug).toBe(slug('expensive-air'));
  });

  it('reuses the same ranking as the /search endpoint', async () => {
    const [viaSearch, viaCatalog] = await Promise.all([
      search.rankProductIds('TESTOIL001'),
      products.catalog(query({ q: 'TESTOIL001' })),
    ]);
    expect(viaSearch.ranks.get(viaSearch.ids[0])!.matchKind).toBe(
      SearchMatchKind.EXACT_TECHNICAL_CODE,
    );
    expect(viaCatalog.items[0].id).toBe(viaSearch.ids[0]);
  });

  it('applies filters to the ranked set rather than after it', async () => {
    // The query matches both oil filters; the brand filter must drop one.
    const unfiltered = await products.catalog(query({ q: `${PREFIX} فیلتر روغن`, limit: 100 }));
    const filtered = await products.catalog(
      query({ q: `${PREFIX} فیلتر روغن`, brand: slug('other'), limit: 100 }),
    );
    expect(onlyOurs(unfiltered.items).length).toBeGreaterThan(onlyOurs(filtered.items).length);
    expect(onlyOurs(filtered.items).every((i) => i.brand?.slug === slug('other'))).toBe(true);
  });

  it('normalizes Persian characters so Arabic yeh and kaf still match', async () => {
    // "فيلتر" uses Arabic yeh (ي); products are stored with Persian yeh (ی).
    const result = await products.catalog(query({ q: `${PREFIX} فيلتر روغن`, limit: 100 }));
    expect(result.normalizedQuery).toContain('فیلتر');
    expect(onlyOurs(result.items).length).toBeGreaterThan(0);
  });

  it('does not match everything when only one token is a common word', async () => {
    // Every seeded product carries "فیلتر" in its keywords. A query pairing it
    // with a word no product has must find nothing, otherwise the whole
    // catalogue comes back and the no-result conversion flow never fires.
    const result = await products.catalog(query({ q: 'فیلتر ناموجودxyz', limit: 100 }));
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('does not fall through to a match-all for a Persian-only query', async () => {
    // A query with no latin characters normalizes to an empty part code, and
    // `contains: ''` matches every row unless the code clauses are guarded.
    const result = await products.catalog(query({ q: 'قطعه کاملا ناموجود', limit: 100 }));
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('returns an empty, well-formed page when nothing matches', async () => {
    const result = await products.catalog(query({ q: 'zzz-no-such-part-zzz' }));
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Facets                                                              */
/* ------------------------------------------------------------------ */

describe('catalog — facets', () => {
  it('counts over the whole filtered set, not just the current page', async () => {
    const result = await products.catalog(query({ category: slug('oil'), limit: 1 }));
    expect(result.items).toHaveLength(1);

    const brandCounts = result.facets.brands.filter((b) => b.slug.startsWith(PREFIX));
    expect(brandCounts).toHaveLength(2);
    expect(brandCounts.every((b) => b.count === 1)).toBe(true);
  });

  it('reports the price bounds of the filtered set', async () => {
    const result = await products.catalog(query({ category: slug('oil'), limit: 100 }));
    expect(result.facets.priceRange.min).toBe(100_000);
    expect(result.facets.priceRange.max).toBe(300_000);
  });
});
