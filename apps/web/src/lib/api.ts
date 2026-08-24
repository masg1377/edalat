import type {
  BrandSummary,
  CategorySummary,
  Paginated,
  ProductDetail,
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

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------------------------------------------ */

export const api = {
  products: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) =>
      request<Paginated<ProductSummary>>(`/products${query(params)}`, { revalidate: 60 }),

    featured: (limit = 8) =>
      request<ProductSummary[]>(`/products/featured${query({ limit })}`, { revalidate: 300 }),

    bestSelling: (limit = 8) =>
      request<ProductSummary[]>(`/products/best-selling${query({ limit })}`, { revalidate: 300 }),

    bySlug: (slug: string) => request<ProductDetail>(`/products/${slug}`, { revalidate: 60 }),

    /** PRD §81 — never compute a price in the browser. */
    price: (productId: string, quantity: number, purchaseType: 'RETAIL' | 'WHOLESALE') =>
      request<import('@edalat/shared').PriceQuote>(
        `/products/${productId}/price${query({ quantity, purchaseType })}`,
        { revalidate: 0 },
      ),
  },

  categories: {
    list: () => request<CategorySummary[]>('/categories', { revalidate: 600 }),
    tree: () => request<Array<CategorySummary & { children: CategorySummary[] }>>('/categories/tree', {
      revalidate: 600,
    }),
  },

  brands: {
    list: (limit?: number) =>
      request<Array<BrandSummary & { productCount: number }>>(`/brands${query({ limit })}`, {
        revalidate: 600,
      }),
  },

  vehicles: {
    brands: () =>
      request<Array<{ id: string; name: string; nameEn: string | null; slug: string; logoUrl: string | null; vehicleCount: number }>>(
        '/vehicles/brands',
        { revalidate: 600 },
      ),
    models: (brandSlug: string) =>
      request<string[]>(`/vehicles/brands/${brandSlug}/models`, { revalidate: 600 }),
    variants: (brandSlug: string, model: string) =>
      request<VehicleSummary[]>(
        `/vehicles/brands/${brandSlug}/models/${encodeURIComponent(model)}/variants`,
        { revalidate: 600 },
      ),
    bySlug: (slug: string) => request<VehicleDetail>(`/vehicles/${slug}`, { revalidate: 300 }),
    products: (vehicleId: string) =>
      request<ProductSummary[]>(`/vehicles/${vehicleId}/products`, { revalidate: 300 }),
  },

  search: {
    query: (params: Record<string, string | number | boolean | undefined>) =>
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
