import type { IdentificationStatus, ManufacturingStatus, OrderStatus } from '@edalat/shared';

/**
 * Persian labels + pill tones for every status enum shown to the customer.
 *
 * `ORDER_STATUS_*` moved here from `/orders/[id]` in phase 6 so the new
 * Dashboard → Orders list (PRD §31) renders the exact same labels/colors as
 * the order detail page instead of a second, drifting copy.
 * `MANUFACTURING_STATUS_*` / `IDENTIFICATION_STATUS_*` are new — phase 6 is
 * the first surface that lists these requests with their status (PRD §29/§12).
 */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'در انتظار بررسی',
  AWAITING_PAYMENT: 'در انتظار پرداخت',
  PAID: 'پرداخت‌شده',
  PROCESSING: 'در حال پردازش',
  PACKED: 'بسته‌بندی‌شده',
  SHIPPED: 'ارسال‌شده',
  DELIVERED: 'تحویل داده‌شده',
  CANCELLED: 'لغوشده',
  RETURNED: 'مرجوع‌شده',
};

export const ORDER_STATUS_TONES: Record<OrderStatus, string> = {
  PENDING: 'bg-sand text-ink-700',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-sand text-ink-700',
  PACKED: 'bg-sand text-ink-700',
  SHIPPED: 'bg-sand text-ink-700',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export const MANUFACTURING_STATUS_LABELS: Record<ManufacturingStatus, string> = {
  SUBMITTED: 'ثبت‌شده',
  REVIEWING: 'در حال بررسی',
  NEED_INFORMATION: 'نیاز به اطلاعات بیشتر',
  FEASIBILITY_APPROVED: 'امکان‌سنجی تأیید شد',
  QUOTATION_SENT: 'استعلام قیمت ارسال شد',
  AWAITING_CONFIRMATION: 'در انتظار تأیید شما',
  APPROVED: 'تأییدشده',
  PRODUCTION: 'در حال تولید',
  QUALITY_CONTROL: 'کنترل کیفیت',
  PACKAGING: 'بسته‌بندی',
  READY: 'آماده تحویل',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
};

export const MANUFACTURING_STATUS_TONES: Record<ManufacturingStatus, string> = {
  SUBMITTED: 'bg-sand text-ink-700',
  REVIEWING: 'bg-sand text-ink-700',
  NEED_INFORMATION: 'bg-amber-100 text-amber-800',
  FEASIBILITY_APPROVED: 'bg-green-100 text-green-800',
  QUOTATION_SENT: 'bg-amber-100 text-amber-800',
  AWAITING_CONFIRMATION: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  PRODUCTION: 'bg-sand text-ink-700',
  QUALITY_CONTROL: 'bg-sand text-ink-700',
  PACKAGING: 'bg-sand text-ink-700',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const IDENTIFICATION_STATUS_LABELS: Record<IdentificationStatus, string> = {
  SUBMITTED: 'ثبت‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  IDENTIFIED: 'شناسایی شد',
  AVAILABLE: 'موجود است',
  NEED_MORE_INFORMATION: 'نیاز به اطلاعات بیشتر',
  CAN_BE_MANUFACTURED: 'قابل تولید است',
  UNAVAILABLE: 'ناموجود',
  COMPLETED: 'تکمیل‌شده',
  REJECTED: 'رد شد',
};

export const IDENTIFICATION_STATUS_TONES: Record<IdentificationStatus, string> = {
  SUBMITTED: 'bg-sand text-ink-700',
  UNDER_REVIEW: 'bg-sand text-ink-700',
  IDENTIFIED: 'bg-green-100 text-green-800',
  AVAILABLE: 'bg-green-100 text-green-800',
  NEED_MORE_INFORMATION: 'bg-amber-100 text-amber-800',
  CAN_BE_MANUFACTURED: 'bg-green-100 text-green-800',
  UNAVAILABLE: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};
