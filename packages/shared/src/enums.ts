/**
 * Domain enums shared between the API (NestJS/Prisma) and the web app (Next.js).
 * These MUST stay in sync with `apps/api/prisma/schema.prisma`.
 */

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  WHOLESALE_CUSTOMER: 'WHOLESALE_CUSTOMER',
  SALES_OPERATOR: 'SALES_OPERATOR',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  MANUFACTURING_OPERATOR: 'MANUFACTURING_OPERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** PRD §33 — every cart item carries its own purchase type. */
export const PurchaseType = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE',
} as const;
export type PurchaseType = (typeof PurchaseType)[keyof typeof PurchaseType];

/** PRD §35 */
export const OrderStatus = {
  PENDING: 'PENDING',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** PRD §29 */
export const ManufacturingStatus = {
  SUBMITTED: 'SUBMITTED',
  REVIEWING: 'REVIEWING',
  NEED_INFORMATION: 'NEED_INFORMATION',
  FEASIBILITY_APPROVED: 'FEASIBILITY_APPROVED',
  QUOTATION_SENT: 'QUOTATION_SENT',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  APPROVED: 'APPROVED',
  PRODUCTION: 'PRODUCTION',
  QUALITY_CONTROL: 'QUALITY_CONTROL',
  PACKAGING: 'PACKAGING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ManufacturingStatus =
  (typeof ManufacturingStatus)[keyof typeof ManufacturingStatus];

/** PRD §12 — status of an image-based product identification request. */
export const IdentificationStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  IDENTIFIED: 'IDENTIFIED',
  AVAILABLE: 'AVAILABLE',
  NEED_MORE_INFORMATION: 'NEED_MORE_INFORMATION',
  CAN_BE_MANUFACTURED: 'CAN_BE_MANUFACTURED',
  UNAVAILABLE: 'UNAVAILABLE',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;
export type IdentificationStatus =
  (typeof IdentificationStatus)[keyof typeof IdentificationStatus];

export const ReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  HIDDEN: 'HIDDEN',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const FuelType = {
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  HYBRID: 'HYBRID',
  ELECTRIC: 'ELECTRIC',
  CNG: 'CNG',
  LPG: 'LPG',
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

export const TransmissionType = {
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
  CVT: 'CVT',
  DCT: 'DCT',
} as const;
export type TransmissionType =
  (typeof TransmissionType)[keyof typeof TransmissionType];

/** PRD §40 — search result ranking buckets, highest first. */
export const SearchMatchKind = {
  EXACT_TECHNICAL_CODE: 'EXACT_TECHNICAL_CODE',
  EXACT_OEM_CODE: 'EXACT_OEM_CODE',
  EXACT_PRODUCT_NAME: 'EXACT_PRODUCT_NAME',
  VEHICLE_COMPATIBILITY: 'VEHICLE_COMPATIBILITY',
  BRAND: 'BRAND',
  CATEGORY: 'CATEGORY',
  PARTIAL: 'PARTIAL',
  DESCRIPTION: 'DESCRIPTION',
} as const;
export type SearchMatchKind =
  (typeof SearchMatchKind)[keyof typeof SearchMatchKind];

export const SuggestionKind = {
  PRODUCT: 'PRODUCT',
  VEHICLE: 'VEHICLE',
  BRAND: 'BRAND',
  CATEGORY: 'CATEGORY',
  TECHNICAL_CODE: 'TECHNICAL_CODE',
} as const;
export type SuggestionKind =
  (typeof SuggestionKind)[keyof typeof SuggestionKind];
