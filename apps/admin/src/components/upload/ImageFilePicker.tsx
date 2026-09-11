'use client'

// React Imports
import { useCallback, useState } from 'react'

// Third-party Imports
import { useDropzone } from 'react-dropzone'

// MUI Imports
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

/**
 * PRD §66 — فقط این MIME typeها پذیرفته می‌شوند؛ فایل اجرایی هرگز به این
 * Picker نمی‌رسد.
 */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * معادل MUI/react-dropzone کامپوننت `apps/web/src/components/upload/file-picker.tsx`
 * برای فرم‌های `apps/admin` (که برخلاف `apps/web` از Tailwind، از قالب Vuexy/MUI
 * استفاده می‌کند). همان منطق را بازسازی می‌کند: انتخاب فایل واقعی از دیسک
 * (نه یک TextField متنی برای URL)، اعتبارسنجی MIME/حجم، پیش‌نمایش، حذف، و
 * تبدیل به data URL — چون سرویس آپلود واقعی/object storage هنوز وجود ندارد
 * (`claude/وضعیت-پیاده‌سازی.md`). وقتی یک سرویس آپلود واقعی اضافه شود فقط
 * `toDataUrl` باید عوض شود، نه فرم‌هایی که از این کامپوننت استفاده می‌کنند.
 *
 * چه در حالت تک‌فایل (`multiple=false`، مثلاً «آدرس لوگو») چه چندفایل
 * (`multiple=true`، مثلاً گالری تصاویر محصول)، `value`/`onChange` همیشه
 * آرایه‌ای از URL (یا data URL) است — دقیقاً مثل `FilePicker` در apps/web.
 * فراخوان‌های تک‌فایل فقط `value`/`onChange` را با یک آرایهٔ حداکثر‌یک‌عضوی
 * wrap می‌کنند (نمونه‌ها را در فرم‌های Product/Category/Brand/Vehicle ببینید).
 */
export interface ImageFilePickerProps {
  label: string
  hint?: string
  value: string[]
  onChange: (urls: string[]) => void
  multiple?: boolean
  maxFiles?: number
  accept?: string[]
  maxBytes?: number
  helperText?: string
  error?: boolean
}

const ImageFilePicker = ({
  label,
  hint,
  value,
  onChange,
  multiple = false,
  maxFiles = multiple ? 8 : 1,
  accept = IMAGE_MIME_TYPES,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
  helperText,
  error
}: ImageFilePickerProps) => {
  const [localError, setLocalError] = useState<string | null>(null)
  const maxMb = Math.round(maxBytes / (1024 * 1024))

  const addFiles = useCallback(
    async (files: File[]) => {
      setLocalError(null)

      const accepted: string[] = []

      for (const file of files) {
        if (!accept.includes(file.type)) {
          setLocalError('نوع فایل انتخاب‌شده مجاز نیست.')
          continue
        }

        if (file.size > maxBytes) {
          setLocalError(`حجم هر فایل باید کمتر از ${maxMb} مگابایت باشد.`)
          continue
        }

        try {
          accepted.push(await toDataUrl(file))
        } catch {
          setLocalError('خواندن فایل ناموفق بود.')
        }
      }

      if (accepted.length === 0) return

      const merged = multiple ? [...value, ...accepted] : accepted.slice(0, 1)

      onChange(merged.slice(0, maxFiles))
    },
    [accept, maxBytes, maxMb, maxFiles, multiple, onChange, value]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: accept.reduce<Record<string, string[]>>((acc, mime) => ({ ...acc, [mime]: [] }), {}),
    multiple,
    onDrop: (acceptedFiles: File[]) => void addFiles(acceptedFiles)
  })

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index))
  const canAddMore = value.length < maxFiles

  return (
    <Box>
      <Box className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mbe-2'>
        <Typography variant='body2' color='text.secondary'>
          {label}
        </Typography>
        {hint && (
          <Typography variant='caption' color='text.disabled'>
            {hint}
          </Typography>
        )}
      </Box>

      {value.length > 0 && (
        <Box className='flex flex-wrap gap-3 mbe-3'>
          {value.map((url, index) => (
            <Box key={`${index}-${url.slice(0, 24)}`} className='relative'>
              <Box
                component='img'
                src={url}
                alt={`${label} ${index + 1}`}
                className='is-24 bs-24 object-cover rounded border'
              />
              <IconButton
                size='small'
                onClick={() => removeAt(index)}
                aria-label={`حذف ${label}`}
                className='absolute -top-2 -end-2 shadow-sm'
                sx={{ inlineSize: 22, blockSize: 22, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
              >
                <i className='tabler-x text-xs' />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {canAddMore && (
        <Box
          {...getRootProps()}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary' : 'border-divider'
          }`}
        >
          <input {...getInputProps()} />
          <i className='tabler-cloud-upload text-3xl text-textSecondary' />
          <Typography variant='body2' color='text.secondary'>
            {multiple ? 'برای افزودن تصویر کلیک کنید یا فایل را اینجا رها کنید' : 'برای انتخاب تصویر کلیک کنید یا فایل را اینجا رها کنید'}
          </Typography>
          <Typography variant='caption' color='text.disabled'>
            {`jpg، png یا webp — حداکثر ${maxMb} مگابایت`}
          </Typography>
        </Box>
      )}

      {(localError || (error && helperText)) && (
        <Typography variant='caption' color='error' className='block mbs-2'>
          {localError ?? helperText}
        </Typography>
      )}
    </Box>
  )
}

export default ImageFilePicker

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'))
    reader.readAsDataURL(file)
  })
}
