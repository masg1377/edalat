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
import type { CategorySummary } from '@edalat/shared'

// Components Imports
import CustomTextField from '@core/components/mui/TextField'

// Lib Imports
import { adminApi, ApiError, type CategoryWritePayload } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'

type Props = {
  open: boolean
  editing: CategorySummary | null
  categories: CategorySummary[]
  handleClose: () => void
  onSaved: () => void
}

type FormValues = {
  name: string
  slug: string
  description: string
  imageUrl: string
  parentId: string
  isActive: boolean
}

const emptyValues: FormValues = { name: '', slug: '', description: '', imageUrl: '', parentId: '', isActive: true }

/**
 * PRD §53/§54 — first phase where `Category` is editable from the admin
 * panel at all (previously seed/DB-only, see claude/وضعیت-پیاده‌سازی.md).
 * Same Drawer + react-hook-form shell `full-version`'s
 * `AddCategoryDrawer.tsx` uses; content is ours (real fields, real submit).
 */
const AddCategoryDrawer = ({ open, editing, categories, handleClose, onSaved }: Props) => {
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
            description: '',
            imageUrl: editing.imageUrl ?? '',
            parentId: editing.parentId ?? '',
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

    const payload: CategoryWritePayload = {
      name: data.name,
      ...(data.slug.trim() ? { slug: data.slug.trim() } : {}),
      ...(data.description.trim() ? { description: data.description.trim() } : {}),
      ...(data.imageUrl.trim() ? { imageUrl: data.imageUrl.trim() } : {}),
      ...(data.parentId ? { parentId: data.parentId } : {}),
      isActive: data.isActive
    }

    try {
      if (editing) {
        await adminApi.categories.update(editing.id, payload)
      } else {
        await adminApi.categories.create(payload)
      }

      onSaved()
      handleReset()
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      } else if (err instanceof ApiError || err instanceof Error) {
        setError(err.message)
      } else {
        setError('ثبت دسته‌بندی ناموفق بود.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const parentOptions = categories.filter(c => c.id !== editing?.id)

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
        <Typography variant='h5'>{editing ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'}</Typography>
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
                label='نام'
                placeholder='فیلتر روغن'
                {...(errors.name && { error: true, helperText: 'این فیلد الزامی است.' })}
              />
            )}
          />
          <Controller
            name='slug'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth label='اسلاگ (اختیاری)' placeholder='oil-filter' inputProps={{ dir: 'ltr' }} />
            )}
          />
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} fullWidth multiline rows={3} label='توضیحات' placeholder='توضیح دسته‌بندی…' />
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
            name='parentId'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select fullWidth label='دسته‌بندی والد' slotProps={{ select: { displayEmpty: true } }}>
                <MenuItem value=''>بدون والد (دسته اصلی)</MenuItem>
                {parentOptions.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
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

export default AddCategoryDrawer
