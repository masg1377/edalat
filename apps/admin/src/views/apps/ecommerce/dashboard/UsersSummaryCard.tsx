// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

/**
 * PRD §52/§51 (فاز ۹ه) — جایگزین واقعی full-version's کارت «Orders by
 * Countries» (که Timeline فرستنده/گیرندهٔ کاملاً fake با نام و آدرس
 * ساختگی نشان می‌داد — چیزی که پلتفرم ما اصلاً ردیابی نمی‌کند). این اسلات
 * به‌جایش خلاصهٔ واقعی کاربران را نشان می‌دهد.
 */
const UsersSummaryCard = ({ data }: { data: AdminStatsOverview['usersCount'] }) => {
  return (
    <Card className='flex flex-col'>
      <CardHeader title='کاربران' subheader='خلاصهٔ حساب‌های ثبت‌شده' />
      <CardContent className='flex grow flex-col justify-between gap-6'>
        <div className='flex flex-col gap-1'>
          <Typography color='text.secondary'>مجموع کاربران</Typography>
          <Typography variant='h3'>{data.total.toLocaleString('fa-IR')}</Typography>
        </div>
        <div className='flex flex-col gap-1'>
          <Typography color='text.secondary'>کاربران جدید (بازهٔ آماری)</Typography>
          <Typography variant='h4' color='success.main'>
            {data.newInPeriod.toLocaleString('fa-IR')}
          </Typography>
        </div>
        <Button component={Link} href='/apps/user/list' variant='tonal' fullWidth>
          مشاهده لیست کاربران
        </Button>
      </CardContent>
    </Card>
  )
}

export default UsersSummaryCard
