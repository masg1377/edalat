'use client'

/**
 * Client-side session handling for the admin panel.
 *
 * Mirrors apps/web/src/lib/auth.ts (same bearer-token + single-use-refresh
 * scheme against the same NestJS API) but under its own `ef-admin.*`
 * localStorage namespace so a browser logged into both the storefront and
 * the admin panel doesn't share — or clobber — sessions.
 *
 * The admin login (`POST /auth/login`, phone + password — PRD §30 "Optional
 * password login for staff accounts") returns only `{accessToken,
 * refreshToken, expiresIn}`, no role. RolesGuard on the backend is the real
 * authorization boundary; decoding the JWT here is UX only — hiding nav
 * items and redirecting non-staff roles away from `(private)` — never a
 * security control.
 */

const ACCESS_KEY = 'ef-admin.accessToken'
const REFRESH_KEY = 'ef-admin.refreshToken'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

export interface Session {
  accessToken: string
  refreshToken: string
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getSession(): Session | null {
  const accessToken = read(ACCESS_KEY)
  const refreshToken = read(REFRESH_KEY)

  
return accessToken && refreshToken ? { accessToken, refreshToken } : null
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(ACCESS_KEY, session.accessToken)
    window.localStorage.setItem(REFRESH_KEY, session.refreshToken)
  } catch {
    /* private mode / storage disabled — the user stays logged out */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(ACCESS_KEY)
    window.localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* nothing to clear */
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('برای ادامه باید وارد پنل مدیریت شوید.')
    this.name = 'AuthRequiredError'
  }
}

/* ------------------------------------------------------------------ */
/* JWT payload decoding — UX-only role gate, see file header.          */
/* ------------------------------------------------------------------ */

export interface JwtPayload {
  sub: string
  phone: string
  role: string
  iat?: number
  exp?: number
}

/** Base64url → UTF-8, browser-only (this whole module is 'use client'). */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))

  
return new TextDecoder('utf-8').decode(bytes)
}

export function decodeAccessToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.')

    if (!payload) return null
    
return JSON.parse(decodeBase64Url(payload)) as JwtPayload
  } catch {
    return null
  }
}

/**
 * PRD §51/§55/§56/§57 — roles allowed into the admin panel's UI (backend
 * enforces the rest). `SALES_OPERATOR` was added in phase 9ب: PRD §57 grants
 * that role `GET/PATCH /orders/admin*`, so it needs to actually reach
 * `(private)` at all — before this it could authenticate but was bounced
 * straight back to `/login` by this same gate.
 */
export const ADMIN_PANEL_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER', 'SALES_OPERATOR'] as const
export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number]

export function isAdminPanelRole(role: string | null | undefined): role is AdminPanelRole {
  return !!role && (ADMIN_PANEL_ROLES as readonly string[]).includes(role)
}

export function getCurrentRole(): string | null {
  const session = getSession()

  if (!session) return null
  
return decodeAccessToken(session.accessToken)?.role ?? null
}

/* ------------------------------------------------------------------ */
/* Authenticated fetch — identical retry-once-on-401 behavior as web.   */
/* ------------------------------------------------------------------ */

export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession()

  if (!session) throw new AuthRequiredError()

  const call = (token: string) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers
      }
    })

  let response = await call(session.accessToken)

  if (response.status === 401) {
    const refreshed = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    })

    if (!refreshed.ok) {
      clearSession()
      throw new AuthRequiredError()
    }

    const next = (await refreshed.json()) as Session

    saveSession(next)
    response = await call(next.accessToken)
  }

  if (!response.ok) {
    let message = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

    try {
      const body = (await response.json()) as { message?: string | string[] }

      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message
      }
    } catch {
      /* no JSON body */
    }

    throw new Error(message)
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

/** PRD §30 — staff sign-in with phone + password (not OTP; that's the storefront flow). */
export async function loginWithPassword(phone: string, password: string): Promise<Session> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  })

  const body = await response.json()

  if (!response.ok) {
    throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message)
  }

  const session = body as Session

  saveSession(session)
  
return session
}

export async function logout(): Promise<void> {
  const session = getSession()

  clearSession()
  if (!session) return

  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    })
  } catch {
    /* best-effort; the client-side session is already cleared */
  }
}
