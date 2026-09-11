'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'

/**
 * رفع باگ: `data:image/...;base64,...` (تصاویری که هنوز سرویس آپلود واقعی
 * ندارند و مستقیم به‌صورت data URL ذخیره شده‌اند — `claude/وضعیت-پیاده‌سازی.md`)
 * را نمی‌شود با `<a target='_blank'>` در تب جدید باز کرد؛ Chrome/Firefox
 * ناوبری مستقیم یک تب به data URL را برای امنیت مسدود می‌کنند. این یک
 * Lightbox درون‌صفحه‌ای است که به‌جای باز کردن تب جدید، تصویر را در یک
 * MUI Dialog بزرگ‌تر نشان می‌دهد — برای هر دو نوع URL (data: و http(s):)
 * یکسان کار می‌کند.
 */
export interface ImageLightboxProps {
  src: string | null
  alt?: string
  onClose: () => void
}

const ImageLightbox = ({ src, alt, onClose }: ImageLightboxProps) => {
  return (
    <Dialog open={Boolean(src)} onClose={onClose} maxWidth='md'>
      <DialogContent className='p-0 relative overflow-hidden'>
        <IconButton
          onClick={onClose}
          size='small'
          aria-label='بستن'
          className='absolute block-start-2 inline-end-2 z-10 shadow-sm'
          sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
        >
          <i className='tabler-x' />
        </IconButton>
        {src && (
          <Box
            component='img'
            src={src}
            alt={alt ?? ''}
            className='block max-is-full object-contain'
            sx={{ maxBlockSize: '80vh' }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImageLightbox
