import type { OrderStatus } from '@edalat/shared'
import type { ChipProps } from '@mui/material/Chip'

/**
 * PRD §35 — same Persian labels as apps/web's `lib/status-labels.ts`
 * (`ORDER_STATUS_LABELS`), so the admin panel and the storefront never show
 * a customer two different names for the same status. MUI `Chip` `color`
 * values stand in for that file's Tailwind tone classes.
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
  RETURNED: 'مرجوع‌شده'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, ChipProps['color']> = {
  PENDING: 'default',
  AWAITING_PAYMENT: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error'
}

/** Options for the status `<select>` filter/editor — enum order mirrors PRD §35. */
export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED'
] as OrderStatus[]
