import type {
  FuelType,
  IdentificationStatus,
  ManufacturingStatus,
  OrderStatus,
  PurchaseType,
  SearchMatchKind,
  SuggestionKind,
  TransmissionType,
} from './enums';

/* ------------------------------------------------------------------ */
/* Generic API envelopes                                               */
/* ------------------------------------------------------------------ */

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  /** Machine-readable code, e.g. `PRODUCT_NOT_FOUND`. */
  code?: string;
  details?: Record<string, string[]>;
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

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: BrandSummary | null;
  category: CategorySummary | null;
  mainImageUrl: string | null;
  technicalCode: string | null;
  retailPrice: number;
  /** Lowest available wholesale unit price, if any tier is defined. */
  lowestWholesalePrice: number | null;
  minWholesaleQuantity: number | null;
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

export interface SearchFilters {
  q?: string;
  vehicleId?: string;
  brandId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  purchaseType?: PurchaseType;
  inStock?: boolean;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}

export const SearchSort = {
  RELEVANCE: 'RELEVANCE',
  NEWEST: 'NEWEST',
  BEST_SELLING: 'BEST_SELLING',
  PRICE_ASC: 'PRICE_ASC',
  PRICE_DESC: 'PRICE_DESC',
  RATING: 'RATING',
} as const;
export type SearchSort = (typeof SearchSort)[keyof typeof SearchSort];

export interface SearchResultItem extends ProductSummary {
  matchKind: SearchMatchKind;
  score: number;
}

export interface SearchResponse extends Paginated<SearchResultItem> {
  /** The normalized query actually executed (PRD §41). */
  normalizedQuery: string;
  /** Present when the query looked like a technical code and matched exactly. */
  exactCodeMatchId: string | null;
  facets: {
    brands: Array<{ id: string; name: string; count: number }>;
    categories: Array<{ id: string; name: string; count: number }>;
    vehicleBrands: Array<{ id: string; name: string; count: number }>;
    priceRange: { min: number; max: number };
  };
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
