'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid2'

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'

// Type Imports
import type { VehicleSummary } from '@edalat/shared'
import { FuelType, TransmissionType } from '@edalat/shared'

// Components Imports
import CustomTextField from '@core/components/mui/TextField'

// Lib Imports
import { adminApi, ApiError, type VehicleWritePayload } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'

type VehicleBrandOption = { id: string; name: string }

type Props = {
  open: boolean
  editing: VehicleSummary | null
  brands: VehicleBrandOption[]
  handleClose: () => void
  onSaved: () => void
}

type FormValues = {
  brandId: string
  model: string
  generation: string
  yearFrom: string
  yearTo: string
  bodyType: string
  engine: string
  engineCode: string
  displacement: string
  fuelType: string
  transmission: string
  imageUrl: string
  isActive: boolean

  // service info — PRD §24 «اطلاعات سرویس»
  engineOilGrade: string
  engineOilCapacityLiters: string
  oilChangeKm: string
  oilFilterChangeKm: string
  airFilterChangeKm: string
  cabinFilterChangeKm: string
  fuelFilterChangeKm: string
  serviceNotes: string
}

const emptyValues: FormValues = {
  brandId: '',
  model: '',
  generation: '',
  yearFrom: '',
  yearTo: '',
  bodyType: '',
  engine: '',
  engineCode: '',
  displacement: '',
  fuelType: '',
  transmission: '',
  imageUrl: '',
  isActive: true,
  engineOilGrade: '',
  engineOilCapacityLiters: '',
  oilChangeKm: '',
  oilFilterChangeKm: '',
  airFilterChangeKm: '',
  cabinFilterChangeKm: '',
  fuelFilterChangeKm: '',
  serviceNotes: ''
}

const fuelTypeLabels: Record<string, string> = {
  [FuelType.PETROL]: 'بنزینی',
  [FuelType.DIESEL]: 'دیزلی',
  [FuelType.HYBRID]: 'هیبریدی',
  [FuelType.ELECTRIC]: 'برقی',
  [FuelType.CNG]: 'CNG',
  [FuelType.LPG]: 'LPG'
}

const transmissionLabels: Record<string, string> = {
  [TransmissionType.MANUAL]: 'دنده‌ای',
  [TransmissionType.AUTOMATIC]: 'اتوماتیک',
  [TransmissionType.CVT]: 'CVT',
  [TransmissionType.DCT]: 'DCT'
}

const toNum = (v: string): number | undefined => (v.trim() ? Number(v) : undefined)

/**
 * PRD §24/§25/§54 — Vehicle + VehicleServiceInfo. No direct Vuexy
 * equivalent exists in the template, so this reuses the same
 * Drawer + react-hook-form shell as `AddCategoryDrawer` / `AddBrandDrawer`
 * with vehicle-domain fields instead — "محتوا عوض می‌شه، کامپوننت‌ها همونن".
 */
const AddVehicleDrawer = ({ open, editing, brands, handleClose, onSaved }: Props) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    reset: resetForm,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues: emptyValues })

  useEffect(() => {
    if (!open) return
    resetForm(
      editing
        ? {
            brandId: editing.brand.id,
            model: editing.model,
            generation: editing.generation ?? '',
            yearFrom: editing.yearFrom ? String(editing.yearFrom) : '',
            yearTo: editing.yearTo ? String(editing.yearTo) : '',
            bodyType: '',
            engine: editing.engine ?? '',
            engineCode: editing.engineCode ?? '',
            displacement: '',
            fuelType: '',
            transmission: '',
            imageUrl: '',
            isActive: true,
            engineOilGrade: '',
            engineOilCapacityLiters: '',
            oilChangeKm: '',
            oilFilterChangeKm: '',
            airFilterChangeKm: '',
            cabinFilterChangeKm: '',
            fuelFilterChangeKm: '',
            serviceNotes: ''
          }
        : emptyValues
    )
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const handleReset = () => {
    handleClose()
    resetForm(emptyValues)
    setError(null)
  }

  const onSubmit = async (data: FormValues) => {
    if (!data.brandId) {
      setError('انتخاب برند خودرو الزامی است.')
      
return
    }

    setSubmitting(true)
    setError(null)

    const hasService = [
      data.engineOilGrade,
      data.engineOilCapacityLiters,
      data.oilChangeKm,
      data.oilFilterChangeKm,
      data.airFilterChangeKm,
      data.cabinFilterChangeKm,
      data.fuelFilterChangeKm,
      data.serviceNotes
    ].some(v => v.trim())

    const payload: VehicleWritePayload = {
      brandId: data.brandId,
      model: data.model,
      ...(data.generation.trim() ? { generation: data.generation.trim() } : {}),
      ...(toNum(data.yearFrom) !== undefined ? { yearFrom: toNum(data.yearFrom) } : {}),
      ...(toNum(data.yearTo) !== undefined ? { yearTo: toNum(data.yearTo) } : {}),
      ...(data.bodyType.trim() ? { bodyType: data.bodyType.trim() } : {}),
      ...(data.engine.trim() ? { engine: data.engine.trim() } : {}),
      ...(data.engineCode.trim() ? { engineCode: data.engineCode.trim() } : {}),
      ...(toNum(data.displacement) !== undefined ? { displacement: toNum(data.displacement) } : {}),
      ...(data.fuelType ? { fuelType: data.fuelType } : {}),
      ...(data.transmission ? { transmission: data.transmission } : {}),
      ...(data.imageUrl.trim() ? { imageUrl: data.imageUrl.trim() } : {}),
      isActive: data.isActive,
      ...(hasService
        ? {
            service: {
              ...(data.engineOilGrade.trim() ? { engineOilGrade: data.engineOilGrade.trim() } : {}),
              ...(toNum(data.engineOilCapacityLiters) !== undefined
                ? { engineOilCapacityLiters: toNum(data.engineOilCapacityLiters) }
                : {}),
              ...(toNum(data.oilChangeKm) !== undefined ? { oilChangeKm: toNum(data.oilChangeKm) } : {}),
              ...(toNum(data.oilFilterChangeKm) !== undefined
                ? { oilFilterChangeKm: toNum(data.oilFilterChangeKm) }
                : {}),
              ...(toNum(data.airFilterChangeKm) !== undefined
                ? { airFilterChangeKm: toNum(data.airFilterChangeKm) }
                : {}),
              ...(toNum(data.cabinFilterChangeKm) !== undefined
                ? { cabinFilterChangeKm: toNum(data.cabinFilterChangeKm) }
                : {}),
              ...(toNum(data.fuelFilterChangeKm) !== undefined
                ? { fuelFilterChangeKm: toNum(data.fuelFilterChangeKm) }
                : {}),
              ...(data.serviceNotes.trim() ? { notes: data.serviceNotes.trim() } : {})
            }
          }
        : {})
    }

    try {
      if (editing) await adminApi.vehicles.update(editing.id, payload)
      else await adminApi.vehicles.create(payload)
      onSaved()
      handleReset()
    } catch (err) {
      if (err instanceof AuthRequiredError) setError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else if (err instanceof ApiError || err instanceof Error) setError(err.message)
      else setError('ثبت خودرو ناموفق بود.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 480 } } }}
    >
      <div className='flex items-center justify-between pli-6 plb-5'>
        <Typography variant='h5'>{editing ? 'ویرایش خودرو' : 'افزودن خودرو'}</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='tabler-x text-textSecondary text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-6'>
        {error && (
          <Alert severity='error' className='mbe-4'>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5'>
          <Typography variant='subtitle1' color='text.primary'>
            مشخصات خودرو
          </Typography>
          <Controller
            name='brandId'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                fullWidth
                label='برند خودرو'
                {...(errors.brandId && { error: true, helperText: 'انتخاب برند الزامی است.' })}
              >
                <MenuItem value=''>—</MenuItem>
                {brands.map(b => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='model'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='مدل'
                placeholder='206'
                {...(errors.model && { error: true, helperText: 'این فیلد الزامی است.' })}
              />
            )}
          />
          <Controller
            name='generation'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='نسل / تیپ' placeholder='تیپ ۵' />}
          />
          <Grid container spacing={4}>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='yearFrom'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='از سال' />}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='yearTo'
                control={control}
                render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='تا سال' />}
              />
            </Grid>
          </Grid>
          <Controller
            name='bodyType'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='نوع بدنه' placeholder='سدان' />}
          />
          <Controller
            name='engine'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='موتور' placeholder='TU5' inputProps={{ dir: 'ltr' }} />}
          />
          <Controller
            name='engineCode'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='کد موتور' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='displacement'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth type='number' label='حجم موتور (لیتر)' placeholder='1.6' />
            )}
          />
          <Controller
            name='fuelType'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select fullWidth label='سوخت'>
                <MenuItem value=''>—</MenuItem>
                {Object.values(FuelType).map(v => (
                  <MenuItem key={v} value={v}>
                    {fuelTypeLabels[v]}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='transmission'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select fullWidth label='گیربکس'>
                <MenuItem value=''>—</MenuItem>
                {Object.values(TransmissionType).map(v => (
                  <MenuItem key={v} value={v}>
                    {transmissionLabels[v]}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='imageUrl'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='آدرس تصویر' placeholder='https://…' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='isActive'
            control={control}
            render={({ field }) => (
              <CustomTextField select fullWidth label='وضعیت' value={field.value ? '1' : '0'} onChange={e => field.onChange(e.target.value === '1')}>
                <MenuItem value='1'>فعال</MenuItem>
                <MenuItem value='0'>غیرفعال</MenuItem>
              </CustomTextField>
            )}
          />

          <Divider className='mbs-2' />
          <Typography variant='subtitle1' color='text.primary'>
            اطلاعات سرویس (روغن و فیلترها)
          </Typography>
          <Controller
            name='engineOilGrade'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='درجه روغن موتور' placeholder='5W-30' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='engineOilCapacityLiters'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth type='number' label='ظرفیت روغن (لیتر)' />}
          />
          <Grid container spacing={4}>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='oilChangeKm'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='تعویض روغن (کیلومتر)' />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='oilFilterChangeKm'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='تعویض فیلتر روغن (کیلومتر)' />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='airFilterChangeKm'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='تعویض فیلتر هوا (کیلومتر)' />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='cabinFilterChangeKm'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='تعویض فیلتر کابین (کیلومتر)' />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name='fuelFilterChangeKm'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth type='number' label='تعویض فیلتر سوخت (کیلومتر)' />
                )}
              />
            </Grid>
          </Grid>
          <Controller
            name='serviceNotes'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth multiline rows={3} label='توضیحات سرویس' placeholder='شرایط رانندگی، توصیه سازنده و…' />
            )}
          />

          <div className='flex items-center gap-4'>
            <Button variant='contained' type='submit' disabled={submitting}>
              {submitting ? <CircularProgress size={20} color='inherit' /> : editing ? 'ذخیره' : 'افزودن'}
            </Button>
            <Button variant='tonal' color='error' type='button' onClick={handleReset}>
              انصراف
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default AddVehicleDrawer
