import type {
  FuelType,
  IdentificationStatus,
  ManufacturingStatus,
  OrderStatus,
  PurchaseType,
  SearchMatchKind,
  SuggestionKind,
  TransmissionType,
  UserRole,
} from './enums';

/* ------------------------------------------------------------------ */
/* Generic API envelopes                                               */
/* ------------------------------------------------------------------ */

export interface PaginationMeta {
  page: number;
  /** Items per page. Capped server-side by `MAX_PAGE_SIZE`. */
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Hard ceiling on `limit`, enforced by the API, mirrored here for the client. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 24;

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  /** Machine-readable code, e.g. `PRODUCT_NOT_FOUND`. */
  code?: string;
  details?: Record<string, string[]>;
}


/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

/** PRD §78/§31 — /users domain and the Dashboard → Profile tab (phase 6). */
export interface UserProfile {
  id: string;
  phone: string;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  /** National ID / company registration number, for wholesale invoices (PRD §42/§51). */
  nationalId: string | null;
  role: UserRole;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  productCount?: number;
}

/** PRD §47 — one tier of quantity-based wholesale pricing. */
export interface WholesalePriceTier {
  minQuantity: number;
  /** `null` means "and above". */
  maxQuantity: number | null;
  unitPrice: number;
}

/** PRD §21/§46 — replacement guidance, possibly vehicle-specific. */
export interface ReplacementInfo {
  km: number | null;
  kmMax: number | null;
  months: number | null;
  /** Free text: driving conditions, climate, manufacturer advice (PRD §22). */
  notes: string | null;
}

/**
 * The lightweight product shape used by every listing surface: catalog grid,
 * search results, home rails, related products.
 *
 * Deliberately excludes description, galleries, spec sheets and the full
 * compatibility list — those belong to `ProductDetail`. A catalog page of 24
 * items must not drag along 24 spec sheets.
 */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: BrandSummary | null;
  category: CategorySummary | null;
  mainImageUrl: string | null;
  technicalCode: string | null;
  retailPrice: number;
  /**
   * Cheapest unit price across the product's wholesale tiers — for display
   * only. The billable price always comes from `PricingService.quote()`.
   */
  lowestWholesalePrice: number | null;
  minWholesaleQuantity: number | null;
  /** How many vehicles this part fits (PRD §20) — a count, not the list. */
  compatibleVehicleCount: number;
  ratingAverage: number;
  ratingCount: number;
  inStock: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  sku: string;
  oemCodes: string[];
  images: string[];
  specifications: Record<string, string>;
  wholesaleTiers: WholesalePriceTier[];
  replacement: ReplacementInfo | null;
  availableQuantity: number;
  compatibleVehicles: VehicleSummary[];
  relatedProducts: ProductSummary[];
  similarProducts: ProductSummary[];
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

export interface VehicleBrandSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
}

export interface VehicleSummary {
  id: string;
  slug: string;
  brand: VehicleBrandSummary;
  model: string;
  generation: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engine: string | null;
  engineCode: string | null;
}

export interface VehicleDetail extends VehicleSummary {
  displacement: number | null;
  fuelType: FuelType | null;
  transmission: TransmissionType | null;
  bodyType: string | null;
  specifications: Record<string, string>;
  service: VehicleServiceInfo | null;
}

/** PRD §24 — service information shown on a vehicle detail page. */
export interface VehicleServiceInfo {
  engineOilGrade: string | null;
  engineOilCapacityLiters: number | null;
  oilChangeKm: number | null;
  oilFilterChangeKm: number | null;
  airFilterChangeKm: number | null;
  cabinFilterChangeKm: number | null;
  fuelFilterChangeKm: number | null;
  notes: string | null;
}

/** PRD §20 — a product plus the other vehicles it is shared with. */
export interface SharedCompatibility {
  product: ProductSummary;
  selectedVehicleId: string;
  sharedWith: VehicleSummary[];
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * Sort keys. Lowercase because they travel in URLs and end up in shared links
 * and search-engine indexes, where `price_asc` reads better than `PRICE_ASC`.
 */
export const CatalogSort = {
  RELEVANCE: 'relevance',
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  BEST_SELLING: 'best_selling',
  RATING: 'rating',
} as const;
export type CatalogSort = (typeof CatalogSort)[keyof typeof CatalogSort];

/** Query shape of the catalog endpoint, mirrored by the page's URL params. */
export interface CatalogQuery {
  q?: string;
  /** Category slug — slugs, not ids, so URLs stay readable and SEO-friendly. */
  category?: string;
  brand?: string;
  vehicleId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  purchaseType?: PurchaseType;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}

export interface SearchResultItem extends ProductSummary {
  matchKind: SearchMatchKind;
  score: number;
}

export interface SearchFacets {
  brands: Array<{ id: string; name: string; slug: string; count: number }>;
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
}

export interface SearchResponse extends Paginated<SearchResultItem> {
  /** The normalized query actually executed (PRD §41). */
  normalizedQuery: string;
  /** Present when the query looked like a technical code and matched exactly. */
  exactCodeMatchId: string | null;
  facets: SearchFacets;
}

/** Catalog response — a page of products plus the facets used to filter them. */
export interface CatalogResponse extends Paginated<ProductSummary> {
  /** Echo of the normalized query when `q` was supplied, else null. */
  normalizedQuery: string | null;
  exactCodeMatchId: string | null;
  facets: SearchFacets;
}

export interface SearchSuggestion {
  kind: SuggestionKind;
  label: string;
  /** Route to navigate to when the suggestion is picked. */
  href: string;
  imageUrl?: string | null;
}

/* ------------------------------------------------------------------ */
/* Cart & orders                                                       */
/* ------------------------------------------------------------------ */

export interface CartItem {
  id: string;
  product: ProductSummary;
  purchaseType: PurchaseType;
  quantity: number;
  /** Server-calculated. Never trust a client-supplied price (PRD §32). */
  unitPrice: number;
  lineTotal: number;
  /** Set when the quantity is below the wholesale minimum. */
  warning: string | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: 'IRT';
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
  trackingCode: string | null;
}

/** PRD §31/§34 — a saved shipping address, scoped to its owner (phase 5). */
export interface Address {
  id: string;
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string | null;
  line: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One line of a placed order — denormalized so it reads correctly even if the product changes later. */
export interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  technicalCode: string | null;
  purchaseType: PurchaseType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * PRD §90.6 decision — MVP payment is Mock/Manual (no real gateway), so
 * `gateway` is always `'MOCK'` and `status` is a plain string mirroring the
 * `Payment.status` column (`INITIATED | SUCCEEDED | FAILED | REFUNDED`).
 */
export interface PaymentSummary {
  id: string;
  gateway: string;
  amount: number;
  status: string;
  refId: string | null;
  createdAt: string;
}

/** Full order — checkout response and the order confirmation / detail page (PRD §34/§35). */
export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  address: Address | null;
  shippingMethod: string | null;
  trackingCode: string | null;
  customerNote: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  items: OrderItemDetail[];
  payments: PaymentSummary[];
  paidAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Requests (image identification & private-label manufacturing)       */
/* ------------------------------------------------------------------ */

export interface ProductIdentificationRequestSummary {
  id: string;
  referenceNumber: string;
  status: IdentificationStatus;
  images: string[];
  possibleCode: string | null;
  vehicleLabel: string | null;
  adminResponse: string | null;
  identifiedProduct: ProductSummary | null;
  createdAt: string;
}

export interface ManufacturingRequestSummary {
  id: string;
  referenceNumber: string;
  status: ManufacturingStatus;
  brandName: string;
  productType: string;
  quantity: number;
  quotedUnitPrice: number | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** PRD §81 — result of a server-side price quote. */
export interface PriceQuote {
  productId: string;
  purchaseType: PurchaseType;
  quantity: number;
  unitPrice: number;
  total: number;
  appliedTier: WholesalePriceTier | null;
  minQuantity: number;
  /** Next tier the customer would reach by buying more — used for upsell copy. */
  nextTier: WholesalePriceTier | null;
}
