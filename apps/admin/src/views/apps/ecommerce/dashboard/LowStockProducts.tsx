// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

/**
 * PRD §52/§58 (فاز ۹ه) — جایگزین واقعی full-version's `PopularProducts` (که
 * شش محصول ثابت با عکس/قیمت hardcoded دمو نشان می‌داد و اصلاً به کاتالوگ ما
 * ربطی نداشت). چون `Product.salesCount` هنوز واقعی/به‌روز نیست
 * («salesCount ساختگی» در claude/وضعیت-پیاده‌سازی.md، بخش مشکلات باز)،
 * «محبوب‌ترین محصولات» یک KPI قابل‌اتکا نیست؛ به‌جایش لیست محصولات
 * کم‌موجود را نشان می‌دهد — دقیقاً همان دادهٔ real-time که `lowStock` در
 * پاسخ آماری برمی‌گرداند و برای ادمین actionable است.
 */
const LowStockProducts = ({ data }: { data: AdminStatsOverview['lowStock'] }) => {
  return (
    <Card>
      <CardHeader title='محصولات کم‌موجود' subheader={`موجودی قابل‌فروش زیر ${data.threshold} عدد`} />
      <CardContent className='flex flex-col gap-[1.638rem]'>
        {data.items.length === 0 ? (
          <Typography color='text.disabled'>در حال حاضر محصولی با موجودی کم وجود ندارد.</Typography>
        ) : (
          data.items.map(item => (
            <Link
              key={item.id}
              href={`/apps/ecommerce/products/list`}
              className='flex items-center gap-4 no-underline text-inherit'
            >
              {item.mainImageUrl ? (
                <img
                  src={item.mainImageUrl}
                  alt={item.name}
                  width={46}
                  height={46}
                  className='rounded object-cover'
                />
              ) : (
                <CustomAvatar variant='rounded' size={46} skin='light' color='secondary'>
                  <i className='tabler-box' />
                </CustomAvatar>
              )}
              <div className='flex flex-wrap justify-between items-center gap-x-4 gap-y-1 is-full'>
                <div className='flex flex-col'>
                  <Typography className='font-medium' color='text.primary'>
                    {item.name}
                  </Typography>
                  <Typography variant='body2'>موجودی: {item.availableQuantity.toLocaleString('fa-IR')} عدد</Typography>
                </div>
                <Typography color='error.main'>{item.availableQuantity.toLocaleString('fa-IR')}</Typography>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default LowStockProducts
