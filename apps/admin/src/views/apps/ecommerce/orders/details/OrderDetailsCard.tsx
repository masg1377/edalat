'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { toast } from 'react-toastify'

// Component Imports
import type { OrderStatus } from '@edalat/shared'

import CustomTextField from '@core/components/mui/TextField'

// Lib Imports
import { adminApi, ApiError, type AdminOrderDetail } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '@/lib/order-status'

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`
const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')

/**
 * PRD §35/§57 — order detail + admin edit (status, trackingCode, adminNote).
 * No `full-version` equivalent is available in this environment to copy
 * (see `claude/وضعیت-پیاده‌سازی.md`, فاز ۹ب), so this reuses the same
 * `Card`/`Grid2`/`CustomTextField` shell as `AddVehicleDrawer.tsx` with
 * order-domain content, and mirrors apps/web's `/orders/[id]` page (same
 * `ORDER_STATUS_LABELS` text, same `useParams()` client-side id read to
 * sidestep Next 15 async server `params`).
 */
const OrderDetailsCard = () => {
  const params = useParams<{ id: string }>()
  const orderId = params.id

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [trackingCode, setTrackingCode] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    adminApi.orders
      .get(orderId)
      .then(data => {
        setOrder(data)
        setStatus(data.status)
        setTrackingCode(data.trackingCode ?? '')
        setAdminNote(data.adminNote ?? '')
      })
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(load, [load])

  const handleSave = async () => {
    if (!order) return

    setSaving(true)
    setSaveError(null)

    try {
      const updated = await adminApi.orders.update(order.id, {
        ...(status ? { status } : {}),
        trackingCode: trackingCode.trim(),
        adminNote: adminNote.trim()
      })

      setOrder(updated)
      toast.success('تغییرات سفارش ذخیره شد.')
    } catch (err) {
      if (err instanceof AuthRequiredError) setSaveError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else if (err instanceof ApiError || err instanceof Error) setSaveError(err.message)
      else setSaveError('ذخیره تغییرات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <Alert severity='error'>{loadError ?? 'سفارش یافت نشد.'}</Alert>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <IconButton component={Link} href='/apps/ecommerce/orders/list'>
              <i className='tabler-arrow-right text-textSecondary' />
            </IconButton>
            <div>
              <Typography variant='h5' dir='ltr' className='text-end'>
                {order.orderNumber}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                ثبت‌شده در {date(order.createdAt)}
              </Typography>
            </div>
          </div>
          <Chip
            size='medium'
            variant='tonal'
            color={ORDER_STATUS_COLORS[order.status]}
            label={ORDER_STATUS_LABELS[order.status]}
          />
        </div>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader title='اقلام سفارش' />
          <CardContent className='flex flex-col gap-4'>
            {order.items.map(item => (
              <div key={item.id} className='flex items-center justify-between gap-4'>
                <div className='flex flex-col'>
                  <Typography className='font-medium'>{item.productName}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {item.technicalCode && (
                      <span dir='ltr' className='ltr-slug'>
                        {item.technicalCode} ·{' '}
                      </span>
                    )}
                    {item.quantity} عدد × {money(item.unitPrice)}
                  </Typography>
                </div>
                <Typography className='font-medium' dir='ltr'>
                  {money(item.lineTotal)}
                </Typography>
              </div>
            ))}
            <Divider />
            <div className='flex items-center justify-between'>
              <Typography color='text.secondary'>جمع مبلغ کالاها</Typography>
              <Typography dir='ltr'>{money(order.subtotal)}</Typography>
            </div>
            {order.discountTotal > 0 && (
              <div className='flex items-center justify-between'>
                <Typography color='text.secondary'>تخفیف</Typography>
                <Typography dir='ltr'>{money(-order.discountTotal)}</Typography>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <Typography color='text.secondary'>هزینه ارسال</Typography>
              <Typography dir='ltr'>{order.shippingTotal > 0 ? money(order.shippingTotal) : 'رایگان'}</Typography>
            </div>
            {order.taxTotal > 0 && (
              <div className='flex items-center justify-between'>
                <Typography color='text.secondary'>مالیات</Typography>
                <Typography dir='ltr'>{money(order.taxTotal)}</Typography>
              </div>
            )}
            <Divider />
            <div className='flex items-center justify-between'>
              <Typography variant='h6'>مبلغ نهایی</Typography>
              <Typography variant='h6' dir='ltr'>
                {money(order.grandTotal)}
              </Typography>
            </div>
          </CardContent>
        </Card>

        {order.address && (
          <Card className='mbs-6'>
            <CardHeader title='آدرس تحویل' />
            <CardContent>
              <Typography className='font-medium'>{order.address.recipientName}</Typography>
              <Typography variant='body2' color='text.secondary' dir='ltr' className='text-end'>
                {order.address.phone}
              </Typography>
              <Typography variant='body2' color='text.secondary' className='mbs-2'>
                {order.address.province}، {order.address.city} — {order.address.line}
              </Typography>
              {order.shippingMethod && (
                <Typography variant='body2' color='text.secondary' className='mbs-2'>
                  روش ارسال: {order.shippingMethod}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardHeader title='مشتری' />
          <CardContent className='flex flex-col gap-2'>
            <Typography className='font-medium'>{order.customerName ?? '—'}</Typography>
            <Typography variant='body2' color='text.secondary' dir='ltr' className='text-end'>
              {order.customerPhone}
            </Typography>
            {order.customerEmail && (
              <Typography variant='body2' color='text.secondary' dir='ltr' className='text-end'>
                {order.customerEmail}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card className='mbs-6'>
          <CardHeader title='وضعیت و پیگیری' />
          <CardContent className='flex flex-col gap-4'>
            {saveError && <Alert severity='error'>{saveError}</Alert>}
            <CustomTextField select fullWidth label='وضعیت سفارش' value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
              {ORDER_STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              fullWidth
              label='کد رهگیری مرسوله'
              value={trackingCode}
              onChange={e => setTrackingCode(e.target.value)}
            />
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='یادداشت داخلی'
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
            />
            <Button variant='contained' disabled={saving} onClick={handleSave}>
              {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrderDetailsCard
