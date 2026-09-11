// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

/**
 * PRD §52/§35 (فاز ۹ه) — جایگزین واقعی full-version's `RadialBarChart` (که
 * «۸۲.۵k Expenses» را hardcode می‌کرد — مفهومی که در پلتفرم ما اصلاً وجود
 * ندارد). به‌جایش «نرخ تحویل سفارش» واقعی را نشان می‌دهد: چند درصد از کل
 * سفارش‌های ثبت‌شده (all-time) به وضعیت DELIVERED رسیده‌اند.
 */
const DeliveryRateChart = ({ ordersByStatus }: { ordersByStatus: AdminStatsOverview['ordersByStatus'] }) => {
  const total = Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0)
  const delivered = ordersByStatus.DELIVERED ?? 0
  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true },
      parentHeightOffset: 0
    },
    grid: { padding: { bottom: 5 } },
    stroke: { lineCap: 'round', curve: 'smooth' },
    colors: ['var(--mui-palette-success-main)'],
    plotOptions: {
      radialBar: {
        endAngle: 90,
        startAngle: -90,
        hollow: { size: '60%' },
        track: { background: 'var(--mui-palette-divider)', strokeWidth: '40%' },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 0,
            fontWeight: 500,
            fontSize: '1.5rem',
            formatter: (val: string) => `${val}%`,
            color: 'var(--mui-palette-text-primary)'
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          chart: { width: 190, height: 132 },
          plotOptions: { radialBar: { dataLabels: { value: { fontSize: '1.5rem' } } } }
        }
      },
      {
        breakpoint: 900,
        options: {
          chart: { width: 195, height: 232 },
          plotOptions: { radialBar: { dataLabels: { value: { fontSize: '1.5rem' } } } }
        }
      }
    ]
  }

  return (
    <Card>
      <CardHeader title={`${delivered.toLocaleString('fa-IR')}`} subheader='تحویل داده‌شده' className='pbe-0' />
      <CardContent className='flex flex-col gap-3 items-center'>
        <AppReactApexCharts type='radialBar' height={148} width='100%' options={options} series={[rate]} />
        <Typography variant='body2' color='text.disabled' className='sm:mbs-2 lg:mbs-0'>
          از مجموع {total.toLocaleString('fa-IR')} سفارش ثبت‌شده
        </Typography>
      </CardContent>
    </Card>
  )
}

export default DeliveryRateChart
