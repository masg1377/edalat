// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { AdminStatsOverview } from '@/lib/api'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`

/**
 * PRD §52/§67 (فاز ۹ه) — جایگزین واقعی full-version's `StatisticsCard`
 * (که Sales/Customers/Products/Revenue را hardcode می‌کرد). چهار KPI که از
 * `GET /admin/stats/overview` می‌آیند: فروش بازه، تعداد سفارش‌های بازه،
 * کاربران جدید بازه، و کالاهای کم‌موجود (یک KPI هشداردهنده، نه صرفاً آماری).
 */
const StatisticsCard = ({ data }: { data: AdminStatsOverview }) => {
  const items: { icon: string; stats: string; title: string; color: ThemeColor }[] = [
    {
      stats: money(data.sales.total),
      title: `فروش ${data.period.days} روز اخیر`,
      color: 'primary',
      icon: 'tabler-currency-dollar'
    },
    {
      color: 'info',
      stats: data.sales.orderCount.toLocaleString('fa-IR'),
      title: `سفارش در ${data.period.days} روز اخیر`,
      icon: 'tabler-shopping-cart'
    },
    {
      color: 'success',
      stats: data.usersCount.newInPeriod.toLocaleString('fa-IR'),
      title: 'کاربر جدید',
      icon: 'tabler-users'
    },
    {
      stats: data.lowStock.count.toLocaleString('fa-IR'),
      color: data.lowStock.count > 0 ? 'error' : 'success',
      title: 'کالای کم‌موجود',
      icon: 'tabler-alert-triangle'
    }
  ]

  return (
    <Card>
      <CardHeader
        title='آمار کلی'
        action={
          <Typography variant='subtitle2' color='text.disabled'>
            بازهٔ {data.period.days} روز اخیر
          </Typography>
        }
      />
      <CardContent className='flex justify-between flex-wrap gap-4'>
        <Grid container spacing={4} sx={{ inlineSize: '100%' }}>
          {items.map((item, index) => (
            <Grid key={index} size={{ xs: 6, sm: 3 }} className='flex items-center gap-4'>
              <CustomAvatar color={item.color} variant='rounded' size={40} skin='light'>
                <i className={item.icon}></i>
              </CustomAvatar>
              <div className='flex flex-col'>
                <Typography variant='h5'>{item.stats}</Typography>
                <Typography variant='body2'>{item.title}</Typography>
              </div>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
