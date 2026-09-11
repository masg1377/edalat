'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

// Lib Imports
import { adminApi, ApiError, type AdminStatsOverview } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'

// Component Imports
import StatisticsCard from './StatisticsCard'
import SalesTrendChart from './SalesTrendChart'
import NewUsersChart from './NewUsersChart'
import DeliveryRateChart from './DeliveryRateChart'
import OrdersByStatusChart from './OrdersByStatusChart'
import OperationalQueues from './OperationalQueues'
import LowStockProducts from './LowStockProducts'
import UsersSummaryCard from './UsersSummaryCard'
import RecentOrdersTable from './RecentOrdersTable'

/**
 * فاز ۹ه — دشبورد آماری ادمین. همان الگوی client-fetch که بقیهٔ صفحات
 * ادمین استفاده می‌کنند (نک: ManageReviewsTable.tsx): useState/useEffect +
 * adminApi، بدون Server Component fetch (این اپ اصلاً از الگوی سرور-فچ
 * استفاده نمی‌کند). دادهٔ صفحه از `GET /admin/stats/overview` می‌آید؛
 * `days` وضعیت محلی است که با تغییرش دوباره فچ می‌شود.
 */
const DashboardOverview = () => {
  const [data, setData] = useState<AdminStatsOverview | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    adminApi.stats
      .overview({ days })
      .then(res => setData(res))
      .catch(err =>
        setLoadError(
          err instanceof AuthRequiredError
            ? 'نشست شما منقضی شده؛ دوباره وارد شوید.'
            : err instanceof ApiError || err instanceof Error
              ? err.message
              : 'خطا در دریافت آمار داشبورد.'
        )
      )
      .finally(() => setLoading(false))
  }, [days])

  if (loadError) {
    return <Alert severity='error'>{loadError}</Alert>
  }

  if (loading || !data) {
    return (
      <div className='flex justify-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <StatisticsCard data={data} />
      </Grid>
      <Grid size={{ xs: 12, xl: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3, xl: 6 }}>
            <NewUsersChart data={data.usersCount} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3, xl: 6 }}>
            <DeliveryRateChart ordersByStatus={data.ordersByStatus} />
          </Grid>
          <Grid size={{ xs: 12, md: 6, xl: 12 }}>
            <OrdersByStatusChart ordersByStatus={data.ordersByStatus} />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, xl: 8 }}>
        <SalesTrendChart data={data.sales} days={days} onDaysChange={setDays} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <OperationalQueues data={data} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <LowStockProducts data={data.lowStock} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <UsersSummaryCard data={data.usersCount} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <RecentOrdersTable data={data.recentOrders} />
      </Grid>
    </Grid>
  )
}

export default DashboardOverview
