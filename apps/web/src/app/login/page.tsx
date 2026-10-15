'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toPersianDigits } from '@edalat/shared';

import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { requestOtp, verifyOtp } from '@/lib/auth';

/**
 * PRD §30 — phone number is the primary credential for this market, so the
 * whole flow is two steps: enter a mobile number, enter the five-digit code.
 * No password, no email, no account creation step — verifying the number
 * creates the account.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const sendCode = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await requestOtp(phone);
      setPhone(result.phone);
      setSecondsLeft(result.ttlSeconds);
      setDevCode(result.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود.');
    } finally {
      setPending(false);
    }
  };

  const submitCode = async () => {
    setPending(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد تأیید نشد.');
    } finally {
      setPending(false);
    }
  };

  const field = 'login-field h-14 w-full px-5 text-center text-lg outline-none transition-colors';

  return (
    // Keep the existing OTP flow within the exported login design.
    <main className="login-page relative isolate grid min-h-screen place-items-center overflow-hidden bg-ink-700 px-4 py-12">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-ink-700 bg-cover bg-center"
        style={{ backgroundImage: 'url(/design/login-background.png)' }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-ink-900/15" />

      <div className="login-card w-full rounded-card p-8 shadow-card md:p-16">
        <div className="text-center">
          <Logo size="md" className="mx-auto" />
          <h1 className="mt-7 text-xl font-bold text-white">
            {step === 'phone' ? 'ورود یا ثبت‌نام' : 'کد تأیید را وارد کنید'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/80">
            {step === 'phone' ? (
              'شماره موبایل خود را وارد کنید. کد تأیید برای شما پیامک می‌شود.'
            ) : (
              <>
                کد ۵ رقمی به شماره <span className="ltr-num font-bold text-white">{phone}</span>{' '}
                ارسال شد.
              </>
            )}
          </p>
        </div>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 'phone') void sendCode();
            else void submitCode();
          }}
        >
          {step === 'phone' ? (
            <label className="block">
              <span className="mb-3 block text-sm font-bold text-white">ورود با شماره موبایل</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09xxxxxxxxx"
                aria-label="شماره موبایل"
                className={`${field} ltr-num`}
              />
            </label>
          ) : (
            <label className="block">
              <span className="sr-only">کد تأیید</span>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={5}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                aria-label="کد تأیید پنج رقمی"
                className={`${field} ltr-num tracking-[0.6em]`}
              />
            </label>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {devCode && (
            <p className="mt-4 rounded-xl bg-brand-500/15 px-4 py-3 text-xs text-brand-100">
              حالت توسعه — کد: <b className="ltr-num">{devCode}</b>
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={pending || (step === 'phone' ? phone.length < 10 : code.length !== 5)}
            className="login-submit mt-6 w-full"
          >
            {pending ? 'لطفاً صبر کنید…' : step === 'phone' ? 'ارسال کد تأیید' : 'ورود'}
          </Button>
        </form>

        {step === 'code' && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              className="text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              تغییر شماره
            </button>

            {secondsLeft > 0 ? (
              <span className="text-white/70">
                ارسال دوباره تا <span className="ltr-num">{toPersianDigits(secondsLeft)}</span>{' '}
                ثانیه
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void sendCode()}
                className="font-bold text-brand-500 underline underline-offset-4"
              >
                ارسال دوباره کد
              </button>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-6 text-white/70">
          با تأیید شماره، حساب کاربری شما ساخته می‌شود.
          <Link href="/" className="mt-3 block text-brand-500 underline underline-offset-4">
            بازگشت به خانه
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
