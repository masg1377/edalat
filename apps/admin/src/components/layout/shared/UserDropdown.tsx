'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'

// Type Imports
import type { UserRole } from '@edalat/shared'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Lib Imports
import { decodeAccessToken, getSession, logout } from '@/lib/auth'
import { USER_ROLE_LABELS } from '@/lib/user-role'

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

/**
 * فاز اصلاحی — باگ ۳: این کامپوننت دقیقاً همان دموی Vuexy بود، دست‌نخورده —
 * نام/ایمیل هاردکد («John Doe» / «admin@vuexy.com»)، آیتم‌های منو
 * (My Profile/Settings/Pricing/FAQ) به هیچ مسیر واقعی وصل نبودند (فقط منو
 * را می‌بستند)، و مهم‌تر از همه Logout واقعاً clearSession()/logout() را
 * صدا نمی‌زد — فقط router.push('/login') بود، یعنی توکن‌ها در localStorage
 * باقی می‌ماندند. اکنون: نام/ایمیل با شمارهٔ موبایل و برچسب فارسی نقش
 * کاربر واقعی (از توکن، طبق همان الگوی PrivateLayout/Login.tsx) جایگزین
 * شد، آیتم‌های بدون مقصد واقعی حذف شدند (طبق تصمیم فاز ۹ه برای
 * Congratulations/Transactions — PRD Rule 7/§77)، و Logout از
 * apps/admin/src/lib/auth.ts استفاده می‌کند.
 */
const UserDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<{ phone: string; role: UserRole | null } | null>(null)

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()

  const { settings } = useSettings()

  useEffect(() => {
    const session = getSession()

    if (!session) return
    const payload = decodeAccessToken(session.accessToken)

    if (payload) {
      setAccount({ phone: payload.phone, role: (payload.role as UserRole) ?? null })
    }
  }, [])

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    await logout()
    router.push('/login')
  }

  const displayName = account?.phone ?? '—'
  const displayRole = account?.role ? USER_ROLE_LABELS[account.role] : ''

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        <Avatar
          ref={anchorRef}
          alt={displayName}
          src='/images/avatars/1.png'
          onClick={handleDropdownOpen}
          className='cursor-pointer bs-[38px] is-[38px]'
        />
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-6 gap-2' tabIndex={-1}>
                    <Avatar alt={displayName} src='/images/avatars/1.png' />
                    <div className='flex items-start flex-col'>
                      <Typography dir='ltr' className='font-medium ltr-slug' color='text.primary'>
                        {displayName}
                      </Typography>
                      <Typography variant='caption'>{displayRole}</Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <div className='flex items-center plb-2 pli-3'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Logout
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
