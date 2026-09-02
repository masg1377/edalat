// React Imports
import { Suspense } from 'react'

// Next Imports
import type { Metadata } from 'next'

// Component Imports
import Login from '@views/Login'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به پنل مدیریت عدالت فیلتر'
}

const LoginPage = async () => {
  // Vars
  const mode = await getServerMode()

  // Login reads the ?next= redirect target via useSearchParams(), which
  // Next.js requires a Suspense boundary for during static generation.
  return (
    <Suspense>
      <Login mode={mode} />
    </Suspense>
  )
}

export default LoginPage
