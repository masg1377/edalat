'use client'

// React Imports
import { useEffect, useState } from 'react'

// Next Imports
import { usePathname, useRouter } from 'next/navigation'

// MUI Imports
import CircularProgress from '@mui/material/CircularProgress'

// Third-party Imports
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Lib Imports
import { getCurrentRole, getSession, isAdminPanelRole } from '@/lib/auth'

/**
 * PRD §51/§90 — gates every `(private)` route (products, categories, brands,
 * vehicles, …) to staff roles. `full-version`'s equivalent layout used
 * NextAuth's server session; we don't have NextAuth here (تصمیم مهم in
 * claude/وضعیت-پیاده‌سازی.md — the admin panel talks to our own NestJS API,
 * not a Prisma/NextAuth pair bundled with the template), and the session
 * lives in localStorage (see lib/auth.ts), so the check has to run
 * client-side. This is UX only — RolesGuard on the API is what actually
 * enforces access; a user who forges past this redirect still gets 403s from
 * every write endpoint.
 *
 * Also mounts `react-toastify`'s <ToastContainer> once for the whole
 * private area, since every CRUD table (categories/brands/vehicles/…)
 * fires toast.success/toast.error on save & delete.
 */
export default function PrivateLayout({ children }: ChildrenType) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const session = getSession()
    const role = session ? getCurrentRole() : null

    if (!session || !isAdminPanelRole(role)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      
return
    }

    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className='flex items-center justify-center bs-[60vh]'>
        <CircularProgress />
      </div>
    )
  }

  return (
    <>
      {children}
      <ToastContainer position='bottom-left' rtl autoClose={3500} />
    </>
  )
}
