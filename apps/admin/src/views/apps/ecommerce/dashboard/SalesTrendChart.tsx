'use client'

// Next Imports
import dynamic from 'next/dynamic'
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// Third Party Imports
import type { ApexOptions } from 'apexcharts'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { day: 'numeric', month: 'numeric' })

const DAY_OPTIONS = [7, 30, 90]

/**
 * PRD §52/§67/§69 (فاز ۹ه) — جایگزین واقعی full-version's `RevenueReport`
 * (که یک نمودار ستونی Earning/Expense و یک بودجهٔ hardcoded داشت — چیزی که
 * در دادهٔ واقعی ما معادل ندارد). این نسخه روند واقعی فروش روزانهٔ
 * سفارش‌های PAID+ را از `sales.dailyBreakdown` نشان می‌دهد؛ به‌جای دکمهٔ
 * فیک «Increase Budget»، لینک واقعی به لیست سفارش‌ها می‌گذارد.
 */
const SalesTrendChart = ({
  data,
  days,
  onDaysChange
}: {
  data: AdminStatsOverview['sales']
  days: number
  onDaysChange: (days: number) => void
}) => {
  const theme = useTheme()
  const disabledText = 'var(--mui-palette-text-disabled)'

  const categories = data.dailyBreakdown.map(point => shortDate(point.date))
  const series = [{ name: 'فروش', data: data.dailyBreakdown.map(point => point.total) }]

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    tooltip: {
      y: { formatter: (val: number) => money(val) }
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-primary-main)'],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: days > 30 ? '70%' : '40%',
        borderRadiusApplication: 'around'
      }
    },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      yaxis: { lines: { show: true } },
      padding: { left: -6, right: -11, bottom: -11 }
    },
    xaxis: {
      axisTicks: { show: false },
      crosshairs: { opacity: 0 },
      axisBorder: { show: false },
      categories,
      labels: {
        rotate: days > 30 ? -45 : 0,
        style: {
          colors: disabledText,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    yaxis: {
      tickAmount: 5,
      labels: {
        offsetX: -14,
        formatter: (val: number) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`),
        style: {
          colors: disabledText,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    }
  }

  const dailyAverage = data.orderCount > 0 ? Math.round(data.total / days) : 0

  return (
    <Card>
      <Grid container>
        <Grid size={{ xs: 12, sm: 8 }} className='border-r'>
          <CardHeader title='روند فروش' subheader={`مجموع سفارش‌های پرداخت‌شده در ${days} روز اخیر`} />
          <CardContent>
            <AppReactApexCharts type='bar' height={320} width='100%' series={series} options={options} />
          </CardContent>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CardContent className='flex flex-col items-center justify-center min-bs-full gap-8'>
            <div className='flex gap-2'>
              {DAY_OPTIONS.map(option => (
                <Button
                  key={option}
                  size='small'
                  variant={option === days ? 'contained' : 'tonal'}
                  onClick={() => onDaysChange(option)}
                >
                  {option} روز
                </Button>
              ))}
            </div>
            <div className='flex flex-col items-center'>
              <Typography variant='h3'>{money(data.total)}</Typography>
              <Typography>
                <span className='font-medium text-textPrimary'>میانگین روزانه: </span>
                {money(dailyAverage)}
              </Typography>
            </div>
            <Button component={Link} href='/apps/ecommerce/orders/list' variant='contained'>
              مشاهده سفارش‌ها
            </Button>
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  )
}

export default SalesTrendChart
