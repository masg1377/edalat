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

// Third-party Imports
import { useForm, Controller } from 'react-hook-form'

// Type Imports
import type { BrandSummary } from '@edalat/shared'

// Components Imports
import CustomTextField from '@core/components/mui/TextField'

// Upload Imports
import ImageFilePicker from '@/components/upload/ImageFilePicker'

// Lib Imports
import { adminApi, ApiError, type BrandWritePayload } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'

type Props = {
  open: boolean
  editing: BrandSummary | null
  handleClose: () => void
  onSaved: () => void
}

type FormValues = { name: string; slug: string; logoUrl: string; description: string; country: string; isActive: boolean }

const emptyValues: FormValues = { name: '', slug: '', logoUrl: '', description: '', country: '', isActive: true }

/** PRD §53/§54 — same Drawer + react-hook-form shell as AddCategoryDrawer, content for `Brand`. */
const AddBrandDrawer = ({ open, editing, handleClose, onSaved }: Props) => {
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
            name: editing.name,
            slug: editing.slug,
            logoUrl: editing.logoUrl ?? '',
            description: '',
            country: editing.country ?? '',
            isActive: true
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
    setSubmitting(true)
    setError(null)

    const payload: BrandWritePayload = {
      name: data.name,
      ...(data.slug.trim() ? { slug: data.slug.trim() } : {}),
      ...(data.logoUrl.trim() ? { logoUrl: data.logoUrl.trim() } : {}),
      ...(data.description.trim() ? { description: data.description.trim() } : {}),
      ...(data.country.trim() ? { country: data.country.trim() } : {}),
      isActive: data.isActive
    }

    try {
      if (editing) await adminApi.brands.update(editing.id, payload)
      else await adminApi.brands.create(payload)
      onSaved()
      handleReset()
    } catch (err) {
      if (err instanceof AuthRequiredError) setError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else if (err instanceof ApiError || err instanceof Error) setError(err.message)
      else setError('ثبت برند ناموفق بود.')
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
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
    >
      <div className='flex items-center justify-between pli-6 plb-5'>
        <Typography variant='h5'>{editing ? 'ویرایش برند' : 'افزودن برند'}</Typography>
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
          <Controller
            name='name'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='نام برند'
                placeholder='عدالت فیلتر'
                {...(errors.name && { error: true, helperText: 'این فیلد الزامی است.' })}
              />
            )}
          />
          <Controller
            name='slug'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='اسلاگ (اختیاری)' placeholder='edalat-filter' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='logoUrl'
            control={control}
            render={({ field }) => (
              <ImageFilePicker
                label='لوگوی برند'
                value={field.value ? [field.value] : []}
                onChange={urls => field.onChange(urls[0] ?? '')}
              />
            )}
          />
          <Controller
            name='country'
            control={control}
            render={({ field }) => <CustomTextField {...field} fullWidth label='کشور سازنده' placeholder='ایران' />}
          />
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth multiline rows={3} label='توضیحات' placeholder='معرفی کوتاه برند…' />
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

export default AddBrandDrawer
