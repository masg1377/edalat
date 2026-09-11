'use client'

// Next Imports
import dynamic from 'next/dynamic'

// MUI Imports
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import type { ApexOptions } from 'apexcharts'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

// Styled Component Imports
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

/**
 * PRD §52 (فاز ۹ه) — جایگزین واقعی full-version's `LineChartProfit` (که یک
 * سری «سود» کاملاً hardcoded داشت و در دادهٔ ما معادلی ندارد — Rule 7).
 * به‌جایش، روند واقعی «کاربران جدید» را از `usersCount.dailyBreakdown`
 * نشان می‌دهد.
 */
const NewUsersChart = ({ data }: { data: AdminStatsOverview['usersCount'] }) => {
  const theme = useTheme()
  const infoColor = 'var(--mui-palette-info-main)'
  const series = [{ data: data.dailyBreakdown.map(point => point.count) }]

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    tooltip: { enabled: false },
    grid: {
      strokeDashArray: 6,
      borderColor: 'var(--mui-palette-divider)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      padding: { top: -20, left: -5, right: 10, bottom: -10 }
    },
    stroke: {
      width: 3,
      lineCap: 'butt',
      curve: 'straight'
    },
    colors: [infoColor],
    markers: {
      size: 4,
      strokeWidth: 3,
      colors: infoColor,
      strokeColors: 'transparent',
      discrete: [
        {
          size: 5.5,
          seriesIndex: 0,
          strokeColor: infoColor,
          fillColor: 'var(--mui-palette-background-paper)',
          dataPointIndex: Math.max(series[0].data.length - 1, 0)
        }
      ]
    },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: { labels: { show: false } },
    responsive: [
      { breakpoint: theme.breakpoints.values.lg, options: { chart: { height: 68 } } },
      { breakpoint: theme.breakpoints.values.md, options: { chart: { height: 98 } } },
      { breakpoint: 430, options: { chart: { height: 114 } } }
    ]
  }

  return (
    <Card>
      <CardHeader title='کاربران جدید' subheader={`${data.dailyBreakdown.length} روز اخیر`} className='pbe-0' />
      <CardContent className='flex flex-col gap-3 pbs-3'>
        <AppReactApexCharts type='line' height={68} width='100%' options={options} series={series} />
        <div className='flex items-center justify-between flex-wrap gap-x-4 gap-y-0.5'>
          <Typography variant='h4' color='text.primary'>
            {data.newInPeriod.toLocaleString('fa-IR')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            از {data.total.toLocaleString('fa-IR')} کاربر کل
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default NewUsersChart
