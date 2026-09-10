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

// Type Imports
import type { ManufacturingStatus } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'

// Lib Imports
import { adminApi, ApiError, type AdminManufacturingRequest } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'
import {
  MANUFACTURING_STATUS_COLORS,
  MANUFACTURING_STATUS_LABELS,
  MANUFACTURING_STATUS_OPTIONS
} from '@/lib/manufacturing-status'

const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')
const dateTime = (iso: string) => new Date(iso).toLocaleString('fa-IR')

/**
 * PRD §28/§55 (فاز ۹ج) — manufacturing request detail + admin edit
 * (status, adminNotes, quotedUnitPrice/quotedAt, assignedToId) + full
 * RequestEvent trail. هیچ معادل Vuexy مستقیمی وجود ندارد، پس دقیقاً همان
 * ساختار `OrderDetailsCard.tsx` (Card/Grid2/CustomTextField shell +
 * useParams client-side id) با محتوای دامنهٔ تولید بازاستفاده شده است.
 */
const ManufacturingRequestDetailsCard = () => {
  const params = useParams<{ id: string }>()
  const requestId = params.id

  const [item, setItem] = useState<AdminManufacturingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [status, setStatus] = useState<ManufacturingStatus | ''>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [quotedUnitPrice, setQuotedUnitPrice] = useState('')
  const [quotedAt, setQuotedAt] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    adminApi.manufacturing
      .get(requestId)
      .then(data => {
        setItem(data)
        setStatus(data.status)
        setAdminNotes(data.adminNotes ?? '')
        setQuotedUnitPrice(data.quotedUnitPrice !== null ? String(data.quotedUnitPrice) : '')
        setQuotedAt(data.quotedAt ? data.quotedAt.slice(0, 10) : '')
        setAssignedToId(data.assignedToId ?? '')
      })
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }, [requestId])

  useEffect(load, [load])

  const handleSave = async () => {
    if (!item) return

    setSaving(true)
    setSaveError(null)

    try {
      const updated = await adminApi.manufacturing.update(item.id, {
        ...(status ? { status } : {}),
        adminNotes: adminNotes.trim(),
        ...(quotedUnitPrice.trim() ? { quotedUnitPrice: Number(quotedUnitPrice) } : {}),
        ...(quotedAt ? { quotedAt: new Date(quotedAt).toISOString() } : {}),
        assignedToId: assignedToId.trim()
      })

      setItem(updated)
      toast.success('تغییرات درخواست ذخیره شد.')
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

  if (loadError || !item) {
    return <Alert severity='error'>{loadError ?? 'درخواست یافت نشد.'}</Alert>
  }

  const referenceFiles = [
    { label: 'تصویر محصول', url: item.productImageUrl },
    { label: 'تصویر نمونه', url: item.sampleImageUrl },
    { label: 'فایل لوگو', url: item.logoUrl },
    { label: 'طراحی بسته‌بندی', url: item.packagingDesignUrl }
  ].filter((f): f is { label: string; url: string } => Boolean(f.url))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <IconButton component={Link} href='/apps/requests/manufacturing/list'>
              <i className='tabler-arrow-right text-textSecondary' />
            </IconButton>
            <div>
              <Typography variant='h5' dir='ltr' className='text-end'>
                {item.referenceNumber}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                ثبت‌شده در {date(item.createdAt)}
              </Typography>
            </div>
          </div>
          <Chip
            size='medium'
            variant='tonal'
            color={MANUFACTURING_STATUS_COLORS[item.status]}
            label={MANUFACTURING_STATUS_LABELS[item.status]}
          />
        </div>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader title='مشتری و برند' />
          <CardContent className='flex flex-col gap-2'>
            <Typography className='font-medium'>{item.contactName}</Typography>
            {item.companyName && <Typography color='text.secondary'>{item.companyName}</Typography>}
            <Typography variant='body2' color='text.secondary' dir='ltr' className='text-end'>
              {item.phone}
            </Typography>
            {item.email && (
              <Typography variant='body2' color='text.secondary' dir='ltr' className='text-end'>
                {item.email}
              </Typography>
            )}
            {(item.province || item.city || item.address) && (
              <Typography variant='body2' color='text.secondary' className='mbs-2'>
                {[item.province, item.city, item.address].filter(Boolean).join('، ')}
              </Typography>
            )}
            {item.preferredContactMethod && (
              <Typography variant='body2' color='text.secondary'>
                روش تماس ترجیحی: {item.preferredContactMethod}
              </Typography>
            )}
            <Divider className='mbs-2' />
            <Typography className='font-medium mbs-2'>برند: {item.brandName}</Typography>
          </CardContent>
        </Card>

        <Card className='mbs-6'>
          <CardHeader title='محصول درخواستی' />
          <CardContent className='flex flex-col gap-2'>
            <Typography>نوع محصول: {item.productType}</Typography>
            {item.productName && <Typography>نام محصول: {item.productName}</Typography>}
            {item.technicalCode && (
              <Typography>
                کد فنی: <span dir='ltr'>{item.technicalCode}</span>
              </Typography>
            )}
            {item.targetVehicles && <Typography>خودروهای هدف: {item.targetVehicles}</Typography>}
            <Typography dir='ltr' className='text-end'>
              تعداد: {item.quantity.toLocaleString('fa-IR')}
            </Typography>
          </CardContent>
        </Card>

        {referenceFiles.length > 0 && (
          <Card className='mbs-6'>
            <CardHeader title='فایل‌های مرجع' />
            <CardContent className='flex flex-wrap gap-4'>
              {referenceFiles.map(f => (
                <a
                  key={f.label}
                  href={f.url}
                  target='_blank'
                  rel='noreferrer'
                  className='flex flex-col items-center gap-2'
                >
                  <img
                    src={f.url}
                    alt={f.label}
                    className='is-24 bs-24 object-cover rounded border'
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <Typography variant='body2' color='text.secondary'>
                    {f.label}
                  </Typography>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {item.description && (
          <Card className='mbs-6'>
            <CardHeader title='توضیحات مشتری' />
            <CardContent>
              <Typography>{item.description}</Typography>
            </CardContent>
          </Card>
        )}

        <Card className='mbs-6'>
          <CardHeader title='تاریخچه وضعیت' />
          <CardContent className='flex flex-col gap-3'>
            {item.events.length === 0 && <Typography color='text.secondary'>رویدادی ثبت نشده است.</Typography>}
            {item.events.map(ev => (
              <div key={ev.id} className='flex items-start justify-between gap-4 border-be pbe-3'>
                <div className='flex flex-col'>
                  <Typography className='font-medium'>
                    {ev.fromStatus ? `${MANUFACTURING_STATUS_LABELS[ev.fromStatus as ManufacturingStatus] ?? ev.fromStatus} ← ` : ''}
                    {MANUFACTURING_STATUS_LABELS[ev.toStatus as ManufacturingStatus] ?? ev.toStatus}
                    {!ev.isPublic && (
                      <Chip size='small' variant='tonal' color='secondary' label='داخلی' className='mis-2' />
                    )}
                  </Typography>
                  {ev.note && (
                    <Typography variant='body2' color='text.secondary'>
                      {ev.note}
                    </Typography>
                  )}
                </div>
                <Typography variant='body2' color='text.secondary' className='whitespace-nowrap'>
                  {dateTime(ev.createdAt)}
                </Typography>
              </div>
            ))}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardHeader title='وضعیت و مدیریت' />
          <CardContent className='flex flex-col gap-4'>
            {saveError && <Alert severity='error'>{saveError}</Alert>}
            <CustomTextField
              select
              fullWidth
              label='وضعیت درخواست'
              value={status}
              onChange={e => setStatus(e.target.value as ManufacturingStatus)}
            >
              {MANUFACTURING_STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>
                  {MANUFACTURING_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              fullWidth
              type='number'
              label='قیمت واحد استعلامی (تومان)'
              value={quotedUnitPrice}
              onChange={e => setQuotedUnitPrice(e.target.value)}
            />
            <CustomTextField
              fullWidth
              type='date'
              label='تاریخ استعلام'
              value={quotedAt}
              onChange={e => setQuotedAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <CustomTextField
              fullWidth
              label='ارجاع به (شناسه کارشناس)'
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
            />
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='یادداشت داخلی'
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
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

export default ManufacturingRequestDetailsCard
