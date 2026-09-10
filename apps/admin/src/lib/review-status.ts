import type { ReviewStatus } from '@edalat/shared'
import type { ChipProps } from '@mui/material/Chip'

/**
 * PRD §36/§56 (فاز ۹د) — same pattern as `lib/manufacturing-status.ts`:
 * Persian labels + MUI `Chip` colors for the review moderation queue.
 */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'در انتظار تأیید',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  HIDDEN: 'مخفی‌شده'
}

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, ChipProps['color']> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  HIDDEN: 'default'
}

export const REVIEW_STATUS_OPTIONS: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as ReviewStatus[]
