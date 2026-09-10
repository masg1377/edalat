import type {
  BrandSummary,
  CatalogResponse,
  CategorySummary,
  PriceQuote,
  ProductDetail,
  ProductReviewsResponse,
  ProductSummary,
  SearchResponse,
  SearchSuggestion,
  VehicleDetail,
  VehicleSummary,
} from '@edalat/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & {
  /** Seconds to cache on the server. 0 disables caching for live data. */
  revalidate?: number;
};

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate, ...init } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    next: revalidate === undefined ? undefined : { revalidate },
  });

  if (!response.ok) {
    // Never surface a raw backend body to the UI — map it to Persian copy.
    let message = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export type QueryValue = string | number | boolean | undefined | null;

function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------------------------------------------ */

export const api = {
  products: {
    /**
     * The catalog. Filtering, sorting, paging and ranking all happen server
     * side; this call just forwards whatever the URL says.
     */
    catalog: (params: Record<string, QueryValue> = {}) =>
      request<CatalogResponse>(`/products${query(params)}`, { revalidate: 60 }),

    featured: (limit = 8) =>
      request<ProductSummary[]>(`/products/featured${query({ limit })}`, { revalidate: 300 }),

    bestSelling: (limit = 8) =>
      request<ProductSummary[]>(`/products/best-selling${query({ limit })}`, { revalidate: 300 }),

    bySlug: (slug: string) => request<ProductDetail>(`/products/${slug}`, { revalidate: 60 }),

    /** PRD §81 — never compute a price in the browser. */
    price: (productId: string, quantity: number, purchaseType: 'RETAIL' | 'WHOLESALE') =>
      request<PriceQuote>(`/products/${productId}/price${query({ quantity, purchaseType })}`, {
        revalidate: 0,
      }),

    /** PRD §36/فاز ۹د — APPROVED reviews only; feeds the Product Detail tab. */
    reviews: (productId: string, params: Record<string, QueryValue> = {}) =>
      request<ProductReviewsResponse>(`/products/${productId}/reviews${query(params)}`, {
        revalidate: 0,
      }),
  },

  categories: {
    list: () => request<CategorySummary[]>('/categories', { revalidate: 600 }),
    tree: () =>
      request<Array<CategorySummary & { children: CategorySummary[] }>>('/categories/tree', {
        revalidate: 600,
      }),
    /** PRD §63 — the canonical `/categories/{slug}` landing page: the category
     * itself (with its live product count) plus its direct children. */
    bySlug: (slug: string) =>
      request<CategorySummary & { description: string | null; children: CategorySummary[] }>(
        `/categories/${slug}`,
        { revalidate: 600 },
      ),
  },

  brands: {
    list: (limit?: number) =>
      request<Array<BrandSummary & { productCount: number }>>(`/brands${query({ limit })}`, {
        revalidate: 600,
      }),
    bySlug: (slug: string) =>
      request<BrandSummary & { description: string | null }>(`/brands/${slug}`, {
        revalidate: 600,
      }),
  },

  vehicles: {
    brands: () =>
      request<
        Array<{
          id: string;
          name: string;
          nameEn: string | null;
          slug: string;
          logoUrl: string | null;
          vehicleCount: number;
        }>
      >('/vehicles/brands', { revalidate: 600 }),
    models: (brandSlug: string) =>
      request<string[]>(`/vehicles/brands/${brandSlug}/models`, { revalidate: 600 }),
    variants: (brandSlug: string, model: string) =>
      request<VehicleSummary[]>(
        `/vehicles/brands/${brandSlug}/models/${encodeURIComponent(model)}/variants`,
        { revalidate: 600 },
      ),
    /** Resolves by slug (SEO pages) or id (catalog `vehicleId` filter). */
    bySlugOrId: (slugOrId: string) =>
      request<VehicleDetail>(`/vehicles/${slugOrId}`, { revalidate: 300 }),
    /** Flat list — used where category grouping does not matter. */
    products: (vehicleId: string) =>
      request<ProductSummary[]>(`/vehicles/${vehicleId}/products`, { revalidate: 300 }),
    /** PRD §24 — grouped by category, for "فیلتر روغن / فیلتر هوا / فیلتر کابین" sections. */
    productsGrouped: (vehicleId: string) =>
      request<Array<{ categoryId: string; categoryName: string; items: ProductSummary[] }>>(
        `/vehicles/${vehicleId}/products${query({ grouped: true })}`,
        { revalidate: 300 },
      ),
  },

  search: {
    query: (params: Record<string, QueryValue>) =>
      request<SearchResponse>(`/search${query(params)}`, { revalidate: 0 }),
    suggestions: (q: string) =>
      request<SearchSuggestion[]>(`/search/suggestions${query({ q })}`, { revalidate: 0 }),
  },
};

/**
 * Wraps a data call so a page can render its empty state instead of crashing
 * when the API is unreachable — which, during development, it often is.
 */
export async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

/**
 * Like `safe`, but tells the caller whether the call failed, so a page can
 * distinguish "no results" (empty state) from "API is down" (error state).
 */
export async function attempt<T>(promise: Promise<T>): Promise<
  { ok: true; data: T } | { ok: false; error: string }
> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ApiError
          ? error.message
          : 'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.',
    };
  }
}
