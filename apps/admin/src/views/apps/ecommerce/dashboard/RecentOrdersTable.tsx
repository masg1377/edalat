// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

// Lib Imports
import type { OrderStatus } from '@edalat/shared'

import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/order-status'

// Type Imports
import type { AdminStatsOverview } from '@/lib/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`
const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')

/**
 * PRD §52/§57 (فاز ۹ه) — جایگزین واقعی full-version's `InvoiceListTable`
 * (که به یک server action و entity کاملاً دمو به‌نام «Invoice» وصل بود —
 * موجودیتی که اصلاً در schema.prisma ما وجود ندارد). این نسخه آخرین
 * سفارش‌های واقعی (حداکثر ۱۰ مورد، از `recentOrders`) را با همان
 * برچسب/رنگ وضعیتی که `apps/ecommerce/orders/list` استفاده می‌کند نشان
 * می‌دهد — بدون tanstack/react-table چون این ویجت فقط یک نمای خلاصهٔ
 * غیرتعاملی است، نه یک جدول قابل‌مرتب‌سازی/صفحه‌بندی مستقل.
 */
const RecentOrdersTable = ({ data }: { data: AdminStatsOverview['recentOrders'] }) => {
  return (
    <Card>
      <CardHeader
        title='آخرین سفارش‌ها'
        subheader={`${data.length} سفارش اخیر`}
        action={
          <Button component={Link} href='/apps/ecommerce/orders/list' size='small' variant='tonal'>
            مشاهده همه
          </Button>
        }
      />
      {data.length === 0 ? (
        <Typography color='text.disabled' className='p-6'>
          هنوز سفارشی ثبت نشده است.
        </Typography>
      ) : (
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>شمارهٔ سفارش</th>
                <th>مشتری</th>
                <th>وضعیت</th>
                <th>مبلغ</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {data.map(order => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/apps/ecommerce/orders/details/${order.id}`} className='no-underline'>
                      <Typography color='primary.main' dir='ltr' className='text-end'>
                        {order.orderNumber}
                      </Typography>
                    </Link>
                  </td>
                  <td>
                    <Typography>{order.customerName}</Typography>
                  </td>
                  <td>
                    <Chip
                      variant='tonal'
                      label={ORDER_STATUS_LABELS[order.status as OrderStatus]}
                      color={ORDER_STATUS_COLORS[order.status as OrderStatus]}
                      size='small'
                    />
                  </td>
                  <td>
                    <Typography>{money(order.grandTotal)}</Typography>
                  </td>
                  <td>
                    <Typography>{date(order.createdAt)}</Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default RecentOrdersTable
