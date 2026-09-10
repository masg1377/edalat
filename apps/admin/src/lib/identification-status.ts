import type { IdentificationStatus } from '@edalat/shared'
import type { ChipProps } from '@mui/material/Chip'

/**
 * PRD §12/§56 (فاز ۹ج) — same Persian labels as apps/web's `lib/status-labels.ts`
 * (`IDENTIFICATION_STATUS_LABELS`), same pattern as `lib/order-status.ts`/
 * `lib/manufacturing-status.ts`.
 */
export const IDENTIFICATION_STATUS_LABELS: Record<IdentificationStatus, string> = {
  SUBMITTED: 'ثبت‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  IDENTIFIED: 'شناسایی شد',
  AVAILABLE: 'موجود است',
  NEED_MORE_INFORMATION: 'نیاز به اطلاعات بیشتر',
  CAN_BE_MANUFACTURED: 'قابل تولید است',
  UNAVAILABLE: 'ناموجود',
  COMPLETED: 'تکمیل‌شده',
  REJECTED: 'رد شد'
}

export const IDENTIFICATION_STATUS_COLORS: Record<IdentificationStatus, ChipProps['color']> = {
  SUBMITTED: 'default',
  UNDER_REVIEW: 'info',
  IDENTIFIED: 'success',
  AVAILABLE: 'success',
  NEED_MORE_INFORMATION: 'warning',
  CAN_BE_MANUFACTURED: 'success',
  UNAVAILABLE: 'error',
  COMPLETED: 'success',
  REJECTED: 'error'
}

/** Options for the status `<select>` filter/editor — enum order mirrors PRD §12. */
export const IDENTIFICATION_STATUS_OPTIONS: IdentificationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'IDENTIFIED',
  'AVAILABLE',
  'NEED_MORE_INFORMATION',
  'CAN_BE_MANUFACTURED',
  'UNAVAILABLE',
  'COMPLETED',
  'REJECTED'
] as IdentificationStatus[]
