'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Type Imports
import type { OrderStatus } from '@edalat/shared'

import type { AdminStatsOverview } from '@/lib/api'

// Lib Imports
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '@/lib/order-status'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// همان الگوی MUI Chip color که lib/order-status.ts برای جدول سفارش‌ها
// استفاده می‌کند، اینجا به رنگ واقعی CSS var تبدیل می‌شود (apex رنگ چیپ
// نمی‌فهمد). 'default' معادل مستقیمی در پالت ندارد، پس از خاکستری خنثی
// استفاده می‌شود.
const CHIP_COLOR_TO_VAR: Record<string, string> = {
  default: 'var(--mui-palette-grey-500)',
  primary: 'var(--mui-palette-primary-main)',
  secondary: 'var(--mui-palette-secondary-main)',
  success: 'var(--mui-palette-success-main)',
  error: 'var(--mui-palette-error-main)',
  warning: 'var(--mui-palette-warning-main)',
  info: 'var(--mui-palette-info-main)'
}

/**
 * PRD §52/§35 (فاز ۹ه) — جایگزین واقعی full-version's
 * `DonutChartGeneratedLeads` (که «Electronic/Sports/Decor/Fashion» را
 * hardcode می‌کرد). به‌جایش سفارش‌ها را بر اساس OrderStatus واقعی (all-time)
 * نشان می‌دهد — همان رنگ/برچسب فارسی که جدول سفارش‌های ادمین استفاده
 * می‌کند (`lib/order-status.ts`)، برای یکدستی بین صفحات.
 */
const OrdersByStatusChart = ({ ordersByStatus }: { ordersByStatus: AdminStatsOverview['ordersByStatus'] }) => {
  const theme = useTheme()
  const textSecondary = 'var(--mui-palette-text-secondary)'

  const statuses = ORDER_STATUS_OPTIONS.filter(status => (ordersByStatus[status as OrderStatus] ?? 0) > 0)
  const series = statuses.map(status => ordersByStatus[status as OrderStatus] ?? 0)
  const total = series.reduce((sum, count) => sum + count, 0)

  const options: ApexOptions = {
    colors: statuses.map(status => CHIP_COLOR_TO_VAR[ORDER_STATUS_COLORS[status as OrderStatus] ?? 'default']),
    stroke: { width: 0 },
    legend: {
      show: true,
      position: 'bottom',
      fontFamily: theme.typography.fontFamily,
      labels: { colors: textSecondary }
    },
    tooltip: { enabled: true },
    dataLabels: { enabled: false },
    labels: statuses.map(status => ORDER_STATUS_LABELS[status as OrderStatus]),
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.8,
        expandOnClick: false,
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { offsetY: 25, color: textSecondary, fontFamily: theme.typography.fontFamily },
            value: {
              offsetY: -15,
              fontWeight: 500,
              formatter: (val: string) => `${val}`,
              color: 'var(--mui-palette-text-primary)',
              fontFamily: theme.typography.fontFamily,
              fontSize: theme.typography.h3.fontSize as string
            },
            total: {
              show: true,
              showAlways: true,
              label: 'مجموع',
              color: 'var(--mui-palette-text-primary)',
              fontFamily: theme.typography.fontFamily,
              fontSize: theme.typography.body1.fontSize as string
            }
          }
        }
      }
    }
  }

  return (
    <Card className='overflow-visible'>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col'>
          <Typography variant='h5'>سفارش‌ها بر اساس وضعیت</Typography>
          <Typography>مجموع {total.toLocaleString('fa-IR')} سفارش</Typography>
        </div>
        {total > 0 ? (
          <AppReactApexCharts type='donut' width='100%' height={280} series={series} options={options} />
        ) : (
          <Typography color='text.disabled' className='py-6 text-center'>
            هنوز سفارشی ثبت نشده است.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default OrdersByStatusChart
