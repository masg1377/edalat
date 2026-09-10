import type {
  BrandSummary,
  CategorySummary,
  CatalogResponse,
  IdentificationStatus,
  ManufacturingStatus,
  OrderDetail,
  OrderStatus,
  PaginationMeta,
  ProductSummary,
  UserRole,
  VehicleSummary
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

/* ------------------------------------------------------------------ */
/* Phase 9ب — Orders & Users admin management (PRD §57/§51). Mirrors   */
/* apps/api's orders.module.ts / users.module.ts admin DTOs/responses. */
/* ------------------------------------------------------------------ */

export interface AdminOrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  itemCount: number
  grandTotal: number
  createdAt: string
  trackingCode: string | null
  customerName: string | null
  customerPhone: string
}

export interface AdminOrdersListResponse {
  items: AdminOrderSummary[]
  pagination: PaginationMeta
}

/** Return shape of `GET /orders/admin/:id` — full `OrderDetail` plus who placed it. */
export interface AdminOrderDetail extends OrderDetail {
  userId: string
  customerName: string | null
  customerPhone: string
  customerEmail: string | null
  adminNote: string | null
}

export interface UpdateOrderAdminPayload {
  status?: OrderStatus
  trackingCode?: string
  adminNote?: string
}

export interface AdminUserSummary {
  id: string
  phone: string
  phoneVerified: boolean
  email: string | null
  emailVerified: boolean
  firstName: string | null
  lastName: string | null
  companyName: string | null
  nationalId: string | null
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminUsersListResponse {
  items: AdminUserSummary[]
  pagination: PaginationMeta
}

export interface UpdateUserAdminPayload {
  role?: UserRole
  isActive?: boolean
}

/* ------------------------------------------------------------------ */
/* فاز ۹ج — Manufacturing & product-identification admin queues.        */
/* Mirrors apps/api's manufacturing.module.ts / product-requests.module.ts */
/* admin DTOs/responses (RequestEvent shared between both request kinds). */
/* ------------------------------------------------------------------ */

export interface RequestEventRow {
  id: string
  fromStatus: string | null
  toStatus: string
  note: string | null
  actorId: string | null
  isPublic: boolean
  createdAt: string
}

export interface AdminManufacturingSummary {
  id: string
  referenceNumber: string
  status: ManufacturingStatus
  contactName: string
  companyName: string | null
  phone: string
  brandName: string
  productType: string
  quantity: number
  quotedUnitPrice: number | null
  quotedAt: string | null
  assignedToId: string | null
  createdAt: string
}

export interface AdminManufacturingListResponse {
  items: AdminManufacturingSummary[]
  pagination: PaginationMeta
}

export interface AdminManufacturingRequest extends AdminManufacturingSummary {
  email: string | null
  province: string | null
  city: string | null
  address: string | null
  preferredContactMethod: string | null
  logoUrl: string | null
  packagingDesignUrl: string | null
  productCategoryId: string | null
  productName: string | null
  technicalCode: string | null
  targetVehicles: string | null
  productImageUrl: string | null
  sampleImageUrl: string | null
  attachments: string[]
  description: string | null
  adminNotes: string | null
  userId: string | null
  updatedAt: string
  events: RequestEventRow[]
}

export interface UpdateManufacturingAdminPayload {
  status?: ManufacturingStatus
  adminNotes?: string
  quotedUnitPrice?: number
  quotedAt?: string
  assignedToId?: string
  note?: string
  isPublic?: boolean
}

export interface AdminIdentificationSummary {
  id: string
  referenceNumber: string
  status: IdentificationStatus
  images: string[]
  possibleName: string | null
  possibleCode: string | null
  brandGuess: string | null
  vehicleLabel: string | null
  vehicleId: string | null
  quantity: number
  contactPhone: string | null
  adminResponse: string | null
  identifiedProduct: ProductSummary | null
  createdAt: string
}

export interface AdminIdentificationListResponse {
  items: AdminIdentificationSummary[]
  pagination: PaginationMeta
}

export interface AdminIdentificationRequest extends AdminIdentificationSummary {
  description: string | null
  adminNotes: string | null
  userId: string | null
  updatedAt: string
  events: RequestEventRow[]
}

export interface UpdateIdentificationAdminPayload {
  status?: IdentificationStatus
  identifiedProductId?: string
  adminResponse?: string
  adminNotes?: string
  note?: string
  isPublic?: boolean
}

export const adminApi = {
  products: {
    // PRD §77/Rule 7 — reused, not reimplemented: `GET /products` is the
    // same public catalog endpoint the storefront calls. It always filters
    // `isActive: true` (ProductsService.buildWhere), so a deactivated
    // product will not appear here either — a known limitation, tracked in
    // claude/وضعیت-پیاده‌سازی.md until an admin-scoped listing is added.
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
  },

  // PRD §57 — phase 9ب. All three routes require ADMIN/SALES_OPERATOR/SUPER_ADMIN
  // (OrdersController#listAdmin/findOneAdmin/updateAdmin) — see orders.module.ts.
  orders: {
    listAdmin: (params: Record<string, QueryValue> = {}) =>
      authFetch<AdminOrdersListResponse>(`/orders/admin${query(params)}`),
    get: (id: string) => authFetch<AdminOrderDetail>(`/orders/admin/${id}`),
    update: (id: string, payload: UpdateOrderAdminPayload) =>
      authFetch<AdminOrderDetail>(`/orders/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // PRD §51 — phase 9ب. Requires ADMIN/SUPER_ADMIN (UsersController admin routes).
  users: {
    listAdmin: (params: Record<string, QueryValue> = {}) =>
      authFetch<AdminUsersListResponse>(`/users/admin${query(params)}`),
    get: (id: string) => authFetch<AdminUserSummary>(`/users/admin/${id}`),
    update: (id: string, payload: UpdateUserAdminPayload) =>
      authFetch<AdminUserSummary>(`/users/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // فاز ۹ج — PRD §55. Requires ADMIN/MANUFACTURING_OPERATOR/SUPER_ADMIN
  // (ManufacturingController admin routes) — see manufacturing.module.ts.
  manufacturing: {
    listAdmin: (params: Record<string, QueryValue> = {}) =>
      authFetch<AdminManufacturingListResponse>(`/manufacturing/requests/admin${query(params)}`),
    get: (id: string) => authFetch<AdminManufacturingRequest>(`/manufacturing/requests/admin/${id}`),
    update: (id: string, payload: UpdateManufacturingAdminPayload) =>
      authFetch<AdminManufacturingRequest>(`/manufacturing/requests/admin/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
  },

  // فاز ۹ج — PRD §56. Requires ADMIN/SALES_OPERATOR/SUPER_ADMIN
  // (ProductRequestsController admin routes) — see product-requests.module.ts.
  productRequests: {
    listAdmin: (params: Record<string, QueryValue> = {}) =>
      authFetch<AdminIdentificationListResponse>(`/product-requests/admin${query(params)}`),
    get: (id: string) => authFetch<AdminIdentificationRequest>(`/product-requests/admin/${id}`),
    update: (id: string, payload: UpdateIdentificationAdminPayload) =>
      authFetch<AdminIdentificationRequest>(`/product-requests/admin/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
  }
}
