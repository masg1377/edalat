import type { UserRole } from '@edalat/shared'
import type { ChipProps } from '@mui/material/Chip'

/** PRD §51 — role labels shown in the admin user table / role select. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'مشتری',
  WHOLESALE_CUSTOMER: 'مشتری عمده',
  SALES_OPERATOR: 'کارشناس فروش',
  CONTENT_MANAGER: 'مدیر محتوا',
  MANUFACTURING_OPERATOR: 'کارشناس تولید',
  ADMIN: 'مدیر',
  SUPER_ADMIN: 'مدیر ارشد'
}

export const USER_ROLE_COLORS: Record<UserRole, ChipProps['color']> = {
  CUSTOMER: 'default',
  WHOLESALE_CUSTOMER: 'info',
  SALES_OPERATOR: 'primary',
  CONTENT_MANAGER: 'primary',
  MANUFACTURING_OPERATOR: 'primary',
  ADMIN: 'success',
  SUPER_ADMIN: 'success'
}

export const USER_ROLE_OPTIONS: UserRole[] = [
  'CUSTOMER',
  'WHOLESALE_CUSTOMER',
  'SALES_OPERATOR',
  'CONTENT_MANAGER',
  'MANUFACTURING_OPERATOR',
  'ADMIN',
  'SUPER_ADMIN'
] as UserRole[]
