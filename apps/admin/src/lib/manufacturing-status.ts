import type { ManufacturingStatus } from '@edalat/shared'
import type { ChipProps } from '@mui/material/Chip'

/**
 * PRD §29/§55 (فاز ۹ج) — same Persian labels as apps/web's `lib/status-labels.ts`
 * (`MANUFACTURING_STATUS_LABELS`), same pattern `lib/order-status.ts` already
 * uses for orders: MUI `Chip` `color` values stand in for that file's
 * Tailwind tone classes.
 */
export const MANUFACTURING_STATUS_LABELS: Record<ManufacturingStatus, string> = {
  SUBMITTED: 'ثبت‌شده',
  REVIEWING: 'در حال بررسی',
  NEED_INFORMATION: 'نیاز به اطلاعات بیشتر',
  FEASIBILITY_APPROVED: 'امکان‌سنجی تأیید شد',
  QUOTATION_SENT: 'استعلام قیمت ارسال شد',
  AWAITING_CONFIRMATION: 'در انتظار تأیید مشتری',
  APPROVED: 'تأییدشده',
  PRODUCTION: 'در حال تولید',
  QUALITY_CONTROL: 'کنترل کیفیت',
  PACKAGING: 'بسته‌بندی',
  READY: 'آماده تحویل',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده'
}

export const MANUFACTURING_STATUS_COLORS: Record<ManufacturingStatus, ChipProps['color']> = {
  SUBMITTED: 'default',
  REVIEWING: 'info',
  NEED_INFORMATION: 'warning',
  FEASIBILITY_APPROVED: 'success',
  QUOTATION_SENT: 'warning',
  AWAITING_CONFIRMATION: 'warning',
  APPROVED: 'success',
  PRODUCTION: 'info',
  QUALITY_CONTROL: 'info',
  PACKAGING: 'info',
  READY: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error'
}

/** Options for the status `<select>` filter/editor — enum order mirrors PRD §29. */
export const MANUFACTURING_STATUS_OPTIONS: ManufacturingStatus[] = [
  'SUBMITTED',
  'REVIEWING',
  'NEED_INFORMATION',
  'FEASIBILITY_APPROVED',
  'QUOTATION_SENT',
  'AWAITING_CONFIRMATION',
  'APPROVED',
  'PRODUCTION',
  'QUALITY_CONTROL',
  'PACKAGING',
  'READY',
  'COMPLETED',
  'CANCELLED'
] as ManufacturingStatus[]
