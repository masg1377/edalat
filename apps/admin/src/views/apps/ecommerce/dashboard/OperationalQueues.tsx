'use client'

// Next Imports
import dynamic from 'next/dynamic'
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'
import classnames from 'classnames'

// Types Imports
import type { ManufacturingStatus, IdentificationStatus } from '@edalat/shared'

import type { ThemeColor } from '@core/types'
import type { AdminStatsOverview } from '@/lib/api'

// Components Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// چه وضعیت‌هایی «تمام‌شده» محسوب می‌شوند و دیگر جزو صف کار ادمین نیستند —
// PRD §29/§12. مابقی (از جمله NEED_INFORMATION/AWAITING_CONFIRMATION) هنوز
// نیاز به پیگیری دارند.
const MANUFACTURING_TERMINAL: ManufacturingStatus[] = ['COMPLETED', 'CANCELLED'] as ManufacturingStatus[]
const IDENTIFICATION_TERMINAL: IdentificationStatus[] = ['COMPLETED', 'REJECTED', 'UNAVAILABLE'] as IdentificationStatus[]

function sumPending(byStatus: Record<string, number>, terminal: string[]): number {
  return Object.entries(byStatus).reduce((sum, [status, count]) => (terminal.includes(status) ? sum : sum + count), 0)
}

/**
 * PRD §52/§55/§56 (فاز ۹ه) — جایگزین واقعی full-version's `EarningReports`
 * (Net Profit/Total Income/Total Expenses — مفاهیمی که پلتفرم ما اصلاً
 * ندارد؛ Rule 7). به‌جایش خلاصهٔ واقعی صف‌های عملیاتی ادمین را نشان
 * می‌دهد: درخواست‌های تولید و تصویری در حال پیگیری + کالاهای کم‌موجود،
 * به‌همراه یک نمودار میله‌ای واقعی از تعداد سفارش‌های ۷ روز اخیر.
 */
const OperationalQueues = ({ data }: { data: AdminStatsOverview }) => {
  const manufacturingPending = sumPending(data.manufacturingByStatus, MANUFACTURING_TERMINAL)
  const productRequestsPending = sumPending(data.productRequestsByStatus, IDENTIFICATION_TERMINAL)

  const items: { title: string; subtitle: string; amount: number; avatarIcon: string; avatarColor: ThemeColor; href: string }[] = [
    {
      amount: manufacturingPending,
      title: 'درخواست‌های تولید',
      avatarColor: 'primary',
      subtitle: 'در حال پیگیری',
      avatarIcon: 'tabler-building-factory-2',
      href: '/apps/requests/manufacturing/list'
    },
    {
      amount: productRequestsPending,
      title: 'درخواست‌های تصویری',
      avatarColor: 'info',
      subtitle: 'در حال پیگیری',
      avatarIcon: 'tabler-camera',
      href: '/apps/requests/product-identification/list'
    },
    {
      amount: data.lowStock.count,
      title: 'کالای کم‌موجود',
      avatarColor: data.lowStock.count > 0 ? 'error' : 'success',
      subtitle: `موجودی زیر ${data.lowStock.threshold} عدد`,
      avatarIcon: 'tabler-alert-triangle',
      href: '/apps/ecommerce/products/list'
    }
  ]

  const last7 = data.sales.dailyBreakdown.slice(-7)

  const options: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    tooltip: { enabled: false },
    grid: { show: false, padding: { top: -16, left: -18, right: -17, bottom: -11 } },
    plotOptions: { bar: { borderRadius: 4, distributed: true, columnWidth: '60%' } },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: last7.map(() => 'var(--mui-palette-primary-lightOpacity)'),
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    xaxis: {
      categories: last7.map(point => new Date(point.date).toLocaleDateString('fa-IR', { weekday: 'short' })),
      axisTicks: { show: false },
      axisBorder: { show: false },
      tickPlacement: 'on',
      labels: { style: { fontSize: '13px', colors: 'var(--mui-palette-text-disabled)' } }
    },
    yaxis: { show: false }
  }

  return (
    <Card>
      <CardHeader title='صف‌های عملیاتی' subheader='درخواست‌های نیازمند پیگیری' />
      <CardContent className='flex flex-col gap-5'>
        {items.map((item, index) => (
          <Link key={index} href={item.href} className='flex items-center gap-4 no-underline text-inherit'>
            <CustomAvatar skin='light' variant='rounded' color={item.avatarColor} size={34}>
              <i className={classnames(item.avatarIcon, 'text-[22px]')} />
            </CustomAvatar>
            <div className='flex flex-wrap justify-between items-center gap-x-4 gap-y-1 is-full'>
              <div className='flex flex-col'>
                <Typography className='font-medium' color='text.primary'>
                  {item.title}
                </Typography>
                <Typography variant='body2'>{item.subtitle}</Typography>
              </div>
              <Typography variant='h6'>{item.amount.toLocaleString('fa-IR')}</Typography>
            </div>
          </Link>
        ))}
        {last7.length > 0 && (
          <div className='pbs-[60px]'>
            <AppReactApexCharts
              type='bar'
              height={158}
              width='100%'
              series={[{ data: last7.map(point => point.orderCount) }]}
              options={options}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default OperationalQueues
