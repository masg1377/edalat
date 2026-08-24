import { CatalogSort, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PurchaseType } from '@edalat/shared';

/**
 * The URL is the single source of truth for catalog state.
 *
 * Filters, sort and page live in the query string — never in React state — so
 * the page is refresh-safe, shareable, back-button friendly and server
 * renderable. This module is the only place that knows how to read and write
 * that query string.
 */

export interface CatalogParams {
  q: string;
  category: string;
  brand: string;
  vehicleId: string;
  /** Brand slug + model name, from the home quick search (no engine chosen). */
  vehicleBrand: string;
  vehicleModel: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  purchaseType: PurchaseType | null;
  sort: CatalogSort;
  page: number;
  limit: number;
}

/** Next.js hands page components raw search params; normalize them once here. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function toInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const SORT_VALUES = new Set<string>(Object.values(CatalogSort));
const PURCHASE_TYPES = new Set<string>(Object.values(PurchaseType));

export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  const minPriceRaw = first(raw.minPrice);
  const maxPriceRaw = first(raw.maxPrice);
  const sortRaw = first(raw.sort).toLowerCase();
  const purchaseTypeRaw = first(raw.purchaseType).toUpperCase();

  return {
    q: first(raw.q).trim(),
    category: first(raw.category),
    brand: first(raw.brand),
    vehicleId: first(raw.vehicleId),
    vehicleBrand: first(raw.vehicleBrand),
    vehicleModel: first(raw.vehicleModel),
    minPrice: minPriceRaw ? toInt(minPriceRaw, 0, Number.MAX_SAFE_INTEGER, 0) : null,
    maxPrice: maxPriceRaw ? toInt(maxPriceRaw, 0, Number.MAX_SAFE_INTEGER, 0) : null,
    inStock: first(raw.inStock) === 'true',
    purchaseType: PURCHASE_TYPES.has(purchaseTypeRaw) ? (purchaseTypeRaw as PurchaseType) : null,
    sort: SORT_VALUES.has(sortRaw) ? (sortRaw as CatalogSort) : CatalogSort.RELEVANCE,
    page: toInt(first(raw.page), 1, 10_000, 1),
    limit: toInt(first(raw.limit), 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

/** Shapes params for the API client, dropping everything at its default. */
export function toApiQuery(params: CatalogParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.q) out.q = params.q;
  if (params.category) out.category = params.category;
  if (params.brand) out.brand = params.brand;
  if (params.vehicleId) out.vehicleId = params.vehicleId;
  if (params.vehicleBrand) out.vehicleBrand = params.vehicleBrand;
  if (params.vehicleModel) out.vehicleModel = params.vehicleModel;
  if (params.minPrice !== null) out.minPrice = params.minPrice;
  if (params.maxPrice !== null) out.maxPrice = params.maxPrice;
  if (params.inStock) out.inStock = true;
  if (params.purchaseType) out.purchaseType = params.purchaseType;
  if (params.sort !== CatalogSort.RELEVANCE) out.sort = params.sort;
  return out;
}

/**
 * Builds a catalog href from the current params plus an override.
 *
 * Changing any filter resets to page 1 — staying on page 7 of a result set that
 * just shrank to two pages is the classic way to strand a user on an empty grid.
 */
export function buildCatalogHref(
  current: CatalogParams,
  overrides: Partial<CatalogParams>,
): string {
  const next = { ...current, ...overrides };
  const resetsPage = Object.keys(overrides).some((key) => key !== 'page');
  if (resetsPage && overrides.page === undefined) next.page = 1;

  const search = new URLSearchParams();
  if (next.q) search.set('q', next.q);
  if (next.category) search.set('category', next.category);
  if (next.brand) search.set('brand', next.brand);
  if (next.vehicleId) search.set('vehicleId', next.vehicleId);
  if (next.vehicleBrand) search.set('vehicleBrand', next.vehicleBrand);
  if (next.vehicleModel) search.set('vehicleModel', next.vehicleModel);
  if (next.minPrice !== null) search.set('minPrice', String(next.minPrice));
  if (next.maxPrice !== null) search.set('maxPrice', String(next.maxPrice));
  if (next.inStock) search.set('inStock', 'true');
  if (next.purchaseType) search.set('purchaseType', next.purchaseType);
  if (next.sort !== CatalogSort.RELEVANCE) search.set('sort', next.sort);
  if (next.page > 1) search.set('page', String(next.page));
  if (next.limit !== DEFAULT_PAGE_SIZE) search.set('limit', String(next.limit));

  const qs = search.toString();
  return qs ? `/products?${qs}` : '/products';
}

/** True when anything narrows the catalog — drives the "clear filters" chip. */
export function hasActiveFilters(params: CatalogParams): boolean {
  return Boolean(
    params.q ||
      params.category ||
      params.brand ||
      params.vehicleId ||
      params.vehicleBrand ||
      params.vehicleModel ||
      params.minPrice !== null ||
      params.maxPrice !== null ||
      params.inStock ||
      params.purchaseType,
  );
}

/**
 * Sort options offered in the UI.
 *
 * `best_selling` and `rating` are deliberately absent: `salesCount` is only
 * incremented by real orders and `ratingAverage` by approved reviews, and
 * neither has production data yet. Offering them now would sort by noise.
 */
export const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: CatalogSort.RELEVANCE, label: 'مرتبط‌ترین' },
  { value: CatalogSort.NEWEST, label: 'جدیدترین' },
  { value: CatalogSort.PRICE_ASC, label: 'ارزان‌ترین' },
  { value: CatalogSort.PRICE_DESC, label: 'گران‌ترین' },
];
