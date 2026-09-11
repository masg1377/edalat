'use client';

/**
 * Client-side session handling.
 *
 * Tokens live in `localStorage` because the API is a separate origin and issues
 * bearer tokens rather than cookies. Access tokens are short-lived (15m) and the
 * refresh token is single-use and rotated server-side, so a stolen copy expires
 * quickly — but this is still browser storage, so nothing sensitive beyond the
 * tokens themselves is kept here.
 */

const ACCESS_KEY = 'ef.accessToken';
const REFRESH_KEY = 'ef.refreshToken';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface Session {
  accessToken: string;
  refreshToken: string;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const accessToken = read(ACCESS_KEY);
  const refreshToken = read(REFRESH_KEY);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(ACCESS_KEY, session.accessToken);
    window.localStorage.setItem(REFRESH_KEY, session.refreshToken);
  } catch {
    /* private mode / storage disabled — the user stays logged out */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * Authorization header for endpoints that stay open to guests but should
 * still record the caller when they happen to be logged in — e.g. the
 * manufacturing / product-identification lead forms (PRD §88: never gate
 * these behind a login). Unlike `authFetch`, this never throws: no session
 * just means an empty header object, so the request goes through as a guest.
 */
export function optionalAuthHeader(): Record<string, string> {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export class AuthRequiredError extends Error {
  constructor() {
    super('برای ادامه باید وارد حساب کاربری شوید.');
    this.name = 'AuthRequiredError';
  }
}

/**
 * Authenticated fetch with one transparent refresh retry.
 *
 * A 401 usually means the 15-minute access token expired mid-session, not that
 * the user is logged out — so rotate the refresh token once and replay the
 * request before sending anyone back to the login page.
 */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  if (!session) throw new AuthRequiredError();

  const call = (token: string) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });

  let response = await call(session.accessToken);

  if (response.status === 401) {
    const refreshed = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!refreshed.ok) {
      clearSession();
      throw new AuthRequiredError();
    }

    const next = (await refreshed.json()) as Session;
    saveSession(next);
    response = await call(next.accessToken);
  }

  if (!response.ok) {
    let message = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      }
    } catch {
      /* no JSON body */
    }
    throw new Error(message);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/* ---- OTP endpoints (public, no bearer token) ---------------------- */

export async function requestOtp(phone: string) {
  const response = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message);
  }
  return body as { phone: string; ttlSeconds: number; devCode?: string };
}

/**
 * Deliberate sign-out.
 *
 * Mirrors `apps/admin/src/lib/auth.ts` `logout()` — this function existed
 * there but had no equivalent here, so the storefront had no way for a user
 * to actually end their session (only the automatic `authFetch` fallback on
 * an expired/invalid refresh token cleared it). Clears the local session
 * immediately, then best-effort tells the server to revoke the refresh
 * token too; a network failure here must not block sign-out client-side.
 */
export async function logout(): Promise<void> {
  const session = getSession();
  clearSession();
  if (!session) return;

  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    /* best-effort; the client-side session is already cleared */
  }
}

export async function verifyOtp(phone: string, code: string) {
  const response = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message);
  }
  const session = body as Session & { isNewUser: boolean };
  saveSession(session);
  return session;
}
