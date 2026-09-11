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
import TextField from '@mui/material/TextField'

// Third-party Imports
import { toast } from 'react-toastify'

// Type Imports
import type { IdentificationStatus, ProductSummary } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import CustomAutocomplete from '@core/components/mui/Autocomplete'

// Upload Imports
import ImageLightbox from '@/components/lightbox/ImageLightbox'

// Lib Imports
import { adminApi, ApiError, type AdminIdentificationRequest } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'
import {
  IDENTIFICATION_STATUS_COLORS,
  IDENTIFICATION_STATUS_LABELS,
  IDENTIFICATION_STATUS_OPTIONS
} from '@/lib/identification-status'

const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')
const dateTime = (iso: string) => new Date(iso).toLocaleString('fa-IR')

/**
 * PRD §11/§56 (فاز ۹ج) — image-identification request detail + admin edit
 * (status, adminResponse, adminNotes, اتصال به یک Product واقعی) + تاریخچهٔ
 * کامل RequestEvent. دقیقاً همان اسکلت `ManufacturingRequestDetailsCard.tsx`
 * (که خودش از `OrderDetailsCard.tsx` گرفته شده) با یک گالری تصاویر ارسالی
 * مشتری و یک Autocomplete جست‌وجوی محصول اضافه‌شده — نه یک کامپوننت جدید.
 */
const IdentificationRequestDetailsCard = () => {
  const params = useParams<{ id: string }>()
  const requestId = params.id

  const [item, setItem] = useState<AdminIdentificationRequest | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [status, setStatus] = useState<IdentificationStatus | ''>('')
  const [adminResponse, setAdminResponse] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Product-search autocomplete for identifiedProductId (PRD §56).
  const [productQuery, setProductQuery] = useState('')
  const [productOptions, setProductOptions] = useState<ProductSummary[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null)
  const [productSearching, setProductSearching] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    adminApi.productRequests
      .get(requestId)
      .then(data => {
        setItem(data)
        setStatus(data.status)
        setAdminResponse(data.adminResponse ?? '')
        setAdminNotes(data.adminNotes ?? '')
        setSelectedProduct(data.identifiedProduct)
      })
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }, [requestId])

  useEffect(load, [load])

  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProductOptions(selectedProduct ? [selectedProduct] : [])
      
return
    }

    setProductSearching(true)

    const timeout = setTimeout(() => {
      adminApi.products
        .catalog({ q: productQuery, limit: 10 })
        .then(res => setProductOptions(res.items))
        .catch(() => setProductOptions([]))
        .finally(() => setProductSearching(false))
    }, 400)

    
return () => clearTimeout(timeout)
  }, [productQuery, selectedProduct])

  const handleSave = async () => {
    if (!item) return

    setSaving(true)
    setSaveError(null)

    try {
      const updated = await adminApi.productRequests.update(item.id, {
        ...(status ? { status } : {}),
        adminResponse: adminResponse.trim(),
        adminNotes: adminNotes.trim(),
        ...(selectedProduct ? { identifiedProductId: selectedProduct.id } : {})
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

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <IconButton component={Link} href='/apps/requests/product-identification/list'>
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
            color={IDENTIFICATION_STATUS_COLORS[item.status]}
            label={IDENTIFICATION_STATUS_LABELS[item.status]}
          />
        </div>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader title='تصاویر ارسالی مشتری' />
          <CardContent className='flex flex-wrap gap-4'>
            {item.images.length === 0 && <Typography color='text.secondary'>تصویری ارسال نشده است.</Typography>}
            {item.images.map((src, idx) => (
              <button key={src + idx} type='button' onClick={() => setLightboxSrc(src)}>
                <img src={src} alt={`تصویر ${idx + 1}`} className='is-32 bs-32 object-cover rounded border' />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className='mbs-6'>
          <CardHeader title='اطلاعات ارسالی مشتری' />
          <CardContent className='flex flex-col gap-2'>
            {item.possibleName && <Typography>نام احتمالی قطعه: {item.possibleName}</Typography>}
            {item.possibleCode && (
              <Typography>
                کد نوشته‌شده روی قطعه: <span dir='ltr'>{item.possibleCode}</span>
              </Typography>
            )}
            {item.brandGuess && <Typography>برند احتمالی: {item.brandGuess}</Typography>}
            {item.vehicleLabel && <Typography>خودرو: {item.vehicleLabel}</Typography>}
            <Typography dir='ltr' className='text-end'>
              تعداد موردنیاز: {item.quantity.toLocaleString('fa-IR')}
            </Typography>
            {item.contactPhone && (
              <Typography dir='ltr' className='text-end'>
                {item.contactPhone}
              </Typography>
            )}
            {item.description && (
              <>
                <Divider className='mbs-2' />
                <Typography color='text.secondary'>{item.description}</Typography>
              </>
            )}
          </CardContent>
        </Card>

        <Card className='mbs-6'>
          <CardHeader title='تاریخچه وضعیت' />
          <CardContent className='flex flex-col gap-3'>
            {item.events.length === 0 && <Typography color='text.secondary'>رویدادی ثبت نشده است.</Typography>}
            {item.events.map(ev => (
              <div key={ev.id} className='flex items-start justify-between gap-4 border-be pbe-3'>
                <div className='flex flex-col'>
                  <Typography className='font-medium'>
                    {ev.fromStatus
                      ? `${IDENTIFICATION_STATUS_LABELS[ev.fromStatus as IdentificationStatus] ?? ev.fromStatus} ← `
                      : ''}
                    {IDENTIFICATION_STATUS_LABELS[ev.toStatus as IdentificationStatus] ?? ev.toStatus}
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
              onChange={e => setStatus(e.target.value as IdentificationStatus)}
            >
              {IDENTIFICATION_STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>
                  {IDENTIFICATION_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomAutocomplete
              fullWidth
              options={productOptions}
              value={selectedProduct}
              loading={productSearching}
              getOptionLabel={(option: ProductSummary) => option.name}
              isOptionEqualToValue={(option: ProductSummary, value: ProductSummary) => option.id === value.id}
              onChange={(_, value) => setSelectedProduct(value)}
              onInputChange={(_, value) => setProductQuery(value)}
              renderInput={inputParams => (
                <TextField {...inputParams} label='اتصال به محصول شناسایی‌شده' placeholder='جست‌وجوی محصول…' />
              )}
            />

            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label='پاسخ به مشتری'
              helperText='این متن در Dashboard مشتری نمایش داده می‌شود.'
              value={adminResponse}
              onChange={e => setAdminResponse(e.target.value)}
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

      <ImageLightbox src={lightboxSrc} alt='پیش‌نمایش تصویر ارسالی مشتری' onClose={() => setLightboxSrc(null)} />
    </Grid>
  )
}

export default IdentificationRequestDetailsCard
