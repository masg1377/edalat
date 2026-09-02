import type {
  BrandSummary,
  CatalogResponse,
  CategorySummary,
  ProductSummary,
  VehicleSummary,
} from '@edalat/shared'

import { authFetch } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Unauthenticated GETs — same public endpoints the storefront reads. */
async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  })

  if (!response.ok) {
    let message = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

    try {
      const body = (await response.json()) as { message?: string | string[] }

      if (body.message) message = Array.isArray(body.message) ? body.message.join(' ') : body.message
    } catch {
      /* no JSON body */
    }

    throw new ApiError(message, response.status)
  }

  
return response.json() as Promise<T>
}

export type QueryValue = string | number | boolean | undefined | null

function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }

  const qs = search.toString()

  
return qs ? `?${qs}` : ''
}

/* ------------------------------------------------------------------ */
/* Admin write payloads — mirror apps/api's product-write / category-  */
/* write / brand / vehicle-write DTOs. Kept local to the admin app     */
/* since these are write contracts, not part of the public storefront  */
/* API surface that @edalat/shared exists to share.                    */
/* ------------------------------------------------------------------ */

export interface WholesaleTierInput {
  minQuantity: number
  maxQuantity: number | null
  unitPrice: number
}

export interface ProductWritePayload {
  name: string
  slug?: string
  sku: string
  description?: string
  shortDescription?: string
  technicalCode?: string
  oemCodes?: string[]
  aliases?: string[]
  keywords?: string[]
  brandId?: string
  categoryId?: string
  mainImageUrl?: string
  images?: string[]
  specifications?: Record<string, string>
  retailPrice: number
  compareAtPrice?: number
  minWholesaleQty?: number
  stockQuantity?: number
  replacementKm?: number
  replacementKmMax?: number
  replacementMonths?: number
  replacementNotes?: string
  isActive?: boolean
  isManufactured?: boolean
  isFeatured?: boolean
  metaTitle?: string
  metaDescription?: string
  wholesaleTiers?: WholesaleTierInput[]
}

export interface CategoryWritePayload {
  name: string
  slug?: string
  description?: string
  imageUrl?: string
  parentId?: string
  isActive?: boolean
  sortOrder?: number
}

export interface BrandWritePayload {
  name: string
  slug?: string
  logoUrl?: string
  description?: string
  country?: string
  isActive?: boolean
  sortOrder?: number
}

export interface VehicleServiceInfoInput {
  engineOilGrade?: string
  engineOilCapacityLiters?: number
  oilChangeKm?: number
  oilFilterChangeKm?: number
  airFilterChangeKm?: number
  cabinFilterChangeKm?: number
  fuelFilterChangeKm?: number
  notes?: string
}

export interface VehicleWritePayload {
  brandId: string
  model: string
  slug?: string
  generation?: string
  yearFrom?: number
  yearTo?: number
  bodyType?: string
  engine?: string
  engineCode?: string
  displacement?: number
  fuelType?: string
  transmission?: string
  imageUrl?: string
  isActive?: boolean
  service?: VehicleServiceInfoInput
}

export interface CompatibilityWritePayload {
  vehicleId: string
  isExactFit?: boolean
  notes?: string
  replacementKm?: number
  replacementKmMax?: number
  replacementMonths?: number
}

export interface CompatibilityRow {
  id: string
  product: ProductSummary
  isExactFit: boolean
  notes: string | null
  replacementKm: number | null
  replacementKmMax: number | null
  replacementMonths: number | null
}

export interface AdminWholesaleTier {
  id: string
  minQuantity: number
  maxQuantity: number | null
  unitPrice: number
}

export interface AdminCompatibilityRow {
  id: string
  vehicleId: string
  isExactFit: boolean
  notes: string | null
  replacementKm: number | null
  replacementKmMax: number | null
  replacementMonths: number | null
  vehicle: VehicleSummary
}

/** Return shape of `GET /products/admin/:id` — see ProductsService.findForEdit. */
export interface AdminProductDetail {
  id: string
  slug: string
  name: string
  description: string | null
  shortDescription: string | null
  sku: string
  technicalCode: string | null
  oemCodes: string[]
  aliases: string[]
  keywords: string[]
  brandId: string | null
  categoryId: string | null
  mainImageUrl: string | null
  images: string[]
  specifications: Record<string, string>
  retailPrice: number
  compareAtPrice: number | null
  minWholesaleQty: number
  stockQuantity: number
  replacementKm: number | null
  replacementKmMax: number | null
  replacementMonths: number | null
  replacementNotes: string | null
  isActive: boolean
  isManufactured: boolean
  isFeatured: boolean
  metaTitle: string | null
  metaDescription: string | null
  wholesaleRules: AdminWholesaleTier[]
  compatibilities: AdminCompatibilityRow[]
}

export interface AdminVehicleListResponse {
  items: VehicleSummary[]
  total: number
  page: number
  limit: number
}

export const adminApi = {
  products: {
    // PRD §77/Rule 7 — reused, not reimplemented: `GET /products` is the
    // same public catalog endpoint the storefront calls. It always filters
    // `isActive: true` (ProductsService.buildWhere), so a deactivated
    // product will not appear here either — a known limitation, tracked in
    // claude/وضعیت-پیاده‌سازی.md until phase 9ب adds an admin-scoped listing.
    catalog: (params: Record<string, QueryValue> = {}) =>
      publicRequest<CatalogResponse>(`/products${query(params)}`),

    // Admin edit-fetch (added in phase 9a — ProductsController#findForEdit).
    // Guarded, unlike `catalog()`: returns inactive products too, plus ids
    // (wholesale tier / compatibility row) the public shape omits.
    get: (id: string) => authFetch<AdminProductDetail>(`/products/admin/${id}`),
    create: (payload: ProductWritePayload) =>
      authFetch<{ id: string; slug: string }>('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: Partial<ProductWritePayload>) =>
      authFetch<{ id: string; slug: string }>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),

    /** Soft delete — see ProductsService.deactivate on the API side. */
    remove: (id: string) => authFetch<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),
    addCompatibility: (productId: string, payload: CompatibilityWritePayload) =>
      authFetch<CompatibilityRow>(`/products/${productId}/compatibility`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    updateCompatibility: (compatibilityId: string, payload: Partial<CompatibilityWritePayload>) =>
      authFetch<CompatibilityRow>(`/products/compatibility/${compatibilityId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),
    removeCompatibility: (compatibilityId: string) =>
      authFetch<{ ok: true }>(`/products/compatibility/${compatibilityId}`, { method: 'DELETE' })
  },

  categories: {
    list: () => publicRequest<CategorySummary[]>('/categories'),
    create: (payload: CategoryWritePayload) =>
      authFetch<CategorySummary>('/categories', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<CategoryWritePayload>) =>
      authFetch<CategorySummary>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: string) => authFetch<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' })
  },

  brands: {
    list: () => publicRequest<Array<BrandSummary & { productCount: number }>>('/brands'),
    create: (payload: BrandWritePayload) =>
      authFetch<BrandSummary>('/brands', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<BrandWritePayload>) =>
      authFetch<BrandSummary>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: string) => authFetch<{ ok: true }>(`/brands/${id}`, { method: 'DELETE' })
  },

  vehicles: {
    brands: () =>
      publicRequest<
        Array<{ id: string; name: string; slug: string; logoUrl: string | null; vehicleCount: number }>
      >('/vehicles/brands'),

    // Admin-only flat list (added in phase 9a — VehiclesController#list); the
    // storefront still drills brand → model → variant for its own selector.
    list: (params: Record<string, QueryValue> = {}) =>
      publicRequest<AdminVehicleListResponse>(`/vehicles${query(params)}`),
    compatibility: (vehicleId: string) =>
      publicRequest<CompatibilityRow[]>(`/vehicles/${vehicleId}/compatibility`),
    create: (payload: VehicleWritePayload) =>
      authFetch<{ id: string; slug: string }>('/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<VehicleWritePayload>) =>
      authFetch<{ id: string; slug: string }>(`/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }),
    remove: (id: string) => authFetch<{ ok: true }>(`/vehicles/${id}`, { method: 'DELETE' })
  }
}
