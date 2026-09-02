'use client'

// React Imports
import { useEffect, useState } from 'react'

// Next Imports
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid2'

// Third-party Imports
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { toast } from 'react-toastify'

// Type Imports
import type { BrandSummary, CategorySummary, VehicleSummary } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'

// Lib Imports
import {
  adminApi,
  ApiError,
  type AdminCompatibilityRow,
  type AdminProductDetail,
  type CompatibilityWritePayload,
  type ProductWritePayload
} from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'

type FormValues = {
  name: string
  slug: string
  sku: string
  shortDescription: string
  description: string
  technicalCode: string
  oemCodes: string
  aliases: string
  keywords: string
  brandId: string
  categoryId: string
  mainImageUrl: string
  images: string
  retailPrice: string
  compareAtPrice: string
  minWholesaleQty: string
  stockQuantity: string
  replacementKm: string
  replacementKmMax: string
  replacementMonths: string
  replacementNotes: string
  isActive: boolean
  isFeatured: boolean
  isManufactured: boolean
  metaTitle: string
  metaDescription: string
  wholesaleTiers: { minQuantity: string; maxQuantity: string; unitPrice: string }[]
}

const emptyValues: FormValues = {
  name: '',
  slug: '',
  sku: '',
  shortDescription: '',
  description: '',
  technicalCode: '',
  oemCodes: '',
  aliases: '',
  keywords: '',
  brandId: '',
  categoryId: '',
  mainImageUrl: '',
  images: '',
  retailPrice: '',
  compareAtPrice: '',
  minWholesaleQty: '1',
  stockQuantity: '0',
  replacementKm: '',
  replacementKmMax: '',
  replacementMonths: '',
  replacementNotes: '',
  isActive: true,
  isFeatured: false,
  isManufactured: false,
  metaTitle: '',
  metaDescription: '',
  wholesaleTiers: []
}

const toNum = (v: string): number | undefined => (v.trim() ? Number(v) : undefined)

const csvToArray = (v: string): string[] =>
  v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

/**
 * PRD §13/§16/§42/§47/§53 — Product create/edit. No direct single-file
 * Vuexy equivalent: `full-version`'s demo splits this into
 * ProductInformation/ProductImage/ProductInventory/ProductOrganize/
 * ProductVariants tabs built around a fake e-commerce catalog (vendor,
 * collection, size/color variants — none of which exist in this domain).
 * This reuses the same Card/Grid2/CustomTextField/Button building blocks
 * in domain-appropriate sections instead: basic info, codes, images,
 * pricing & wholesale tiers, replacement guidance, vehicle compatibility.
 */
const ProductAddView = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editingId = searchParams.get('id')

  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [compatibilities, setCompatibilities] = useState<AdminCompatibilityRow[]>([])
  const [loading, setLoading] = useState(!!editingId)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [compatVehicleId, setCompatVehicleId] = useState('')
  const [compatSubmitting, setCompatSubmitting] = useState(false)

  const {
    control,
    reset: resetForm,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues: emptyValues })

  const { fields, append, remove } = useFieldArray({ control, name: 'wholesaleTiers' })

  useEffect(() => {
    adminApi.brands.list().then(setBrands).catch(() => undefined)
    adminApi.categories.list().then(setCategories).catch(() => undefined)
    adminApi.vehicles.list({ limit: 200 }).then(res => setVehicles(res.items)).catch(() => undefined)
  }, [])

  const loadProduct = (id: string) => {
    setLoading(true)
    setLoadError(null)
    adminApi.products
      .get(id)
      .then((p: AdminProductDetail) => {
        resetForm({
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          shortDescription: p.shortDescription ?? '',
          description: p.description ?? '',
          technicalCode: p.technicalCode ?? '',
          oemCodes: p.oemCodes.join(', '),
          aliases: p.aliases.join(', '),
          keywords: p.keywords.join(', '),
          brandId: p.brandId ?? '',
          categoryId: p.categoryId ?? '',
          mainImageUrl: p.mainImageUrl ?? '',
          images: p.images.join(', '),
          retailPrice: String(p.retailPrice),
          compareAtPrice: p.compareAtPrice !== null ? String(p.compareAtPrice) : '',
          minWholesaleQty: String(p.minWholesaleQty),
          stockQuantity: String(p.stockQuantity),
          replacementKm: p.replacementKm !== null ? String(p.replacementKm) : '',
          replacementKmMax: p.replacementKmMax !== null ? String(p.replacementKmMax) : '',
          replacementMonths: p.replacementMonths !== null ? String(p.replacementMonths) : '',
          replacementNotes: p.replacementNotes ?? '',
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          isManufactured: p.isManufactured,
          metaTitle: p.metaTitle ?? '',
          metaDescription: p.metaDescription ?? '',
          wholesaleTiers: p.wholesaleRules.map(t => ({
            minQuantity: String(t.minQuantity),
            maxQuantity: t.maxQuantity !== null ? String(t.maxQuantity) : '',
            unitPrice: String(t.unitPrice)
          }))
        })
        setCompatibilities(p.compatibilities)
      })
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات محصول'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (editingId) loadProduct(editingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  const onSubmit = async (data: FormValues) => {
    if (!data.retailPrice.trim()) {
      setFormError('قیمت خرده الزامی است.')
      
return
    }

    setSubmitting(true)
    setFormError(null)

    const payload: ProductWritePayload = {
      name: data.name,
      sku: data.sku,
      retailPrice: Number(data.retailPrice),
      ...(data.slug.trim() ? { slug: data.slug.trim() } : {}),
      ...(data.shortDescription.trim() ? { shortDescription: data.shortDescription.trim() } : {}),
      ...(data.description.trim() ? { description: data.description.trim() } : {}),
      ...(data.technicalCode.trim() ? { technicalCode: data.technicalCode.trim() } : {}),
      oemCodes: csvToArray(data.oemCodes),
      aliases: csvToArray(data.aliases),
      keywords: csvToArray(data.keywords),
      ...(data.brandId ? { brandId: data.brandId } : {}),
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.mainImageUrl.trim() ? { mainImageUrl: data.mainImageUrl.trim() } : {}),
      images: csvToArray(data.images),
      ...(toNum(data.compareAtPrice) !== undefined ? { compareAtPrice: toNum(data.compareAtPrice) } : {}),
      minWholesaleQty: toNum(data.minWholesaleQty) ?? 1,
      stockQuantity: toNum(data.stockQuantity) ?? 0,
      ...(toNum(data.replacementKm) !== undefined ? { replacementKm: toNum(data.replacementKm) } : {}),
      ...(toNum(data.replacementKmMax) !== undefined ? { replacementKmMax: toNum(data.replacementKmMax) } : {}),
      ...(toNum(data.replacementMonths) !== undefined ? { replacementMonths: toNum(data.replacementMonths) } : {}),
      ...(data.replacementNotes.trim() ? { replacementNotes: data.replacementNotes.trim() } : {}),
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      isManufactured: data.isManufactured,
      ...(data.metaTitle.trim() ? { metaTitle: data.metaTitle.trim() } : {}),
      ...(data.metaDescription.trim() ? { metaDescription: data.metaDescription.trim() } : {}),
      wholesaleTiers: data.wholesaleTiers
        .filter(t => t.minQuantity.trim() && t.unitPrice.trim())
        .map(t => ({
          minQuantity: Number(t.minQuantity),
          maxQuantity: t.maxQuantity.trim() ? Number(t.maxQuantity) : null,
          unitPrice: Number(t.unitPrice)
        }))
    }

    try {
      if (editingId) {
        await adminApi.products.update(editingId, payload)
        toast.success('محصول ذخیره شد.')
      } else {
        const created = await adminApi.products.create(payload)

        toast.success('محصول ایجاد شد.')
        router.replace(`/apps/ecommerce/products/add?id=${created.id}`)
      }
    } catch (err) {
      if (err instanceof AuthRequiredError) setFormError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else if (err instanceof ApiError || err instanceof Error) setFormError(err.message)
      else setFormError('ثبت محصول ناموفق بود.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddCompatibility = async () => {
    if (!editingId || !compatVehicleId) return
    setCompatSubmitting(true)

    try {
      const payload: CompatibilityWritePayload = { vehicleId: compatVehicleId, isExactFit: true }

      await adminApi.products.addCompatibility(editingId, payload)
      toast.success('خودرو به لیست سازگاری اضافه شد.')
      setCompatVehicleId('')
      loadProduct(editingId)
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'افزودن ناموفق بود.')
    } finally {
      setCompatSubmitting(false)
    }
  }

  const handleRemoveCompatibility = async (row: AdminCompatibilityRow) => {
    if (!editingId) return
    if (!window.confirm(`«${row.vehicle.brand.name} ${row.vehicle.model}» از لیست سازگاری حذف شود؟`)) return

    try {
      await adminApi.products.removeCompatibility(row.id)
      toast.success('حذف شد.')
      loadProduct(editingId)
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'حذف ناموفق بود.')
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center p-10'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
      <div className='flex flex-wrap sm:items-center justify-between max-sm:flex-col gap-6'>
        <div>
          <Typography variant='h4' className='mbe-1'>
            {editingId ? 'ویرایش محصول' : 'افزودن محصول جدید'}
          </Typography>
          <Typography>مشخصات، قیمت‌گذاری و سازگاری محصول را وارد کنید.</Typography>
        </div>
        <div className='flex flex-wrap max-sm:flex-col gap-4'>
          <Button component={Link} href='/apps/ecommerce/products/list' variant='tonal' color='secondary'>
            انصراف
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {submitting ? <CircularProgress size={20} color='inherit' /> : 'ذخیره محصول'}
          </Button>
        </div>
      </div>

      {loadError && <Alert severity='error'>{loadError}</Alert>}
      {formError && <Alert severity='error'>{formError}</Alert>}

      <Card>
        <CardHeader title='اطلاعات پایه' />
        <CardContent className='flex flex-col gap-5'>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='name'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label='نام محصول'
                    {...(errors.name && { error: true, helperText: 'این فیلد الزامی است.' })}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='sku'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label='SKU'
                    inputProps={{ dir: 'ltr' }}
                    {...(errors.sku && { error: true, helperText: 'این فیلد الزامی است.' })}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='slug'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='اسلاگ (اختیاری)' inputProps={{ dir: 'ltr' }} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='technicalCode'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth label='کد فنی' inputProps={{ dir: 'ltr' }} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='brandId'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label='برند'>
                    <MenuItem value=''>—</MenuItem>
                    {brands.map(b => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='categoryId'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label='دسته‌بندی'>
                    <MenuItem value=''>—</MenuItem>
                    {categories.map(c => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name='shortDescription'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth label='توضیح کوتاه' />}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name='description'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth multiline rows={4} label='توضیحات کامل' />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='کدها و برچسب‌های جست‌وجو' />
        <CardContent className='flex flex-col gap-5'>
          <Controller
            name='oemCodes'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='کدهای OEM (با کاما جدا کنید)' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='aliases'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='نام‌های مستعار (با کاما جدا کنید)' />}
          />
          <Controller
            name='keywords'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='کلیدواژه‌های جست‌وجو (با کاما جدا کنید)' />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='تصاویر' />
        <CardContent className='flex flex-col gap-5'>
          <Controller
            name='mainImageUrl'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='آدرس تصویر اصلی' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='images'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='آدرس تصاویر گالری (با کاما جدا کنید)'
                inputProps={{ dir: 'ltr' }}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='قیمت‌گذاری و موجودی' />
        <CardContent className='flex flex-col gap-5'>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='retailPrice'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='number'
                    label='قیمت خرده (تومان)'
                    {...(errors.retailPrice && { error: true, helperText: 'این فیلد الزامی است.' })}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='compareAtPrice'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='قیمت قبل از تخفیف (اختیاری)' />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='stockQuantity'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='موجودی انبار' />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name='minWholesaleQty'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='حداقل سفارش عمده' />}
              />
            </Grid>
          </Grid>

          <Divider />
          <div className='flex items-center justify-between'>
            <Typography variant='subtitle1' color='text.primary'>
              پلکان قیمت عمده
            </Typography>
            <Button
              size='small'
              variant='tonal'
              startIcon={<i className='tabler-plus' />}
              onClick={() => append({ minQuantity: '', maxQuantity: '', unitPrice: '' })}
              type='button'
            >
              افزودن ردیف
            </Button>
          </div>
          {fields.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              پلکان قیمتی تعریف نشده — قیمت خرده برای همه تعداد‌ها اعمال می‌شود.
            </Typography>
          )}
          {fields.map((tierField, index) => (
            <Grid container spacing={4} key={tierField.id} alignItems='center'>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Controller
                  name={`wholesaleTiers.${index}.minQuantity`}
                  control={control}
                  render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='از تعداد' />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Controller
                  name={`wholesaleTiers.${index}.maxQuantity`}
                  control={control}
                  render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='تا تعداد (خالی=نامحدود)' />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name={`wholesaleTiers.${index}.unitPrice`}
                  control={control}
                  render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='قیمت واحد (تومان)' />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <IconButton color='error' onClick={() => remove(index)} type='button'>
                  <i className='tabler-trash' />
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='اطلاعات تعویض (PRD §21/§22)' />
        <CardContent className='flex flex-col gap-5'>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='replacementKm'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='تعویض از کیلومتر' />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='replacementKmMax'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='تعویض تا کیلومتر' />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='replacementMonths'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='یا هر (ماه)' />}
              />
            </Grid>
          </Grid>
          <Controller
            name='replacementNotes'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth multiline rows={2} label='توضیحات (شرایط رانندگی، توصیه سازنده…)' />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='خودروهای سازگار (PRD §19/§46)' />
        <CardContent className='flex flex-col gap-5'>
          {!editingId ? (
            <Alert severity='info'>برای مدیریت خودروهای سازگار، ابتدا محصول را ذخیره کنید.</Alert>
          ) : (
            <>
              <div className='flex flex-wrap items-center gap-4'>
                <CustomTextField
                  select
                  value={compatVehicleId}
                  onChange={e => setCompatVehicleId(e.target.value)}
                  className='is-[260px]'
                  label='افزودن خودرو'
                >
                  <MenuItem value=''>—</MenuItem>
                  {vehicles
                    .filter(v => !compatibilities.some(c => c.vehicleId === v.id))
                    .map(v => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.brand.name} {v.model}
                      </MenuItem>
                    ))}
                </CustomTextField>
                <Button
                  variant='tonal'
                  type='button'
                  disabled={!compatVehicleId || compatSubmitting}
                  onClick={handleAddCompatibility}
                >
                  {compatSubmitting ? <CircularProgress size={18} /> : 'افزودن'}
                </Button>
              </div>
              <div className='flex flex-wrap gap-3'>
                {compatibilities.length === 0 && (
                  <Typography variant='body2' color='text.secondary'>
                    این محصول هنوز به هیچ خودرویی متصل نشده است.
                  </Typography>
                )}
                {compatibilities.map(c => (
                  <Chip
                    key={c.id}
                    variant='tonal'
                    color='primary'
                    label={`${c.vehicle.brand.name} ${c.vehicle.model}`}
                    onDelete={() => handleRemoveCompatibility(c)}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title='وضعیت و سئو' />
        <CardContent className='flex flex-col gap-5'>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='isActive'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='وضعیت'
                    value={field.value ? '1' : '0'}
                    onChange={e => field.onChange(e.target.value === '1')}
                  >
                    <MenuItem value='1'>فعال</MenuItem>
                    <MenuItem value='0'>غیرفعال</MenuItem>
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='isFeatured'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='ویژه'
                    value={field.value ? '1' : '0'}
                    onChange={e => field.onChange(e.target.value === '1')}
                  >
                    <MenuItem value='1'>بله</MenuItem>
                    <MenuItem value='0'>خیر</MenuItem>
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name='isManufactured'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    select
                    fullWidth
                    label='تولید عدالت فیلتر'
                    value={field.value ? '1' : '0'}
                    onChange={e => field.onChange(e.target.value === '1')}
                  >
                    <MenuItem value='1'>بله</MenuItem>
                    <MenuItem value='0'>خیر</MenuItem>
                  </CustomTextField>
                )}
              />
            </Grid>
          </Grid>
          <Controller
            name='metaTitle'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='عنوان متا (سئو)' />}
          />
          <Controller
            name='metaDescription'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth multiline rows={2} label='توضیحات متا (سئو)' />}
          />
        </CardContent>
      </Card>
    </form>
  )
}

export default ProductAddView
