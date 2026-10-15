'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
const CONTACT_EMAIL = 'example@gmail.com';
/** Reuses the existing email flow; messages are sent by the user's email app. */
export function ContactMailtoForm({ variant = 'contact' }: { variant?: 'contact' | 'wholesale' }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const wholesale = variant === 'wholesale';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = [
      `نام: ${name}`,
      `شماره تماس: ${phone}`,
      `ایمیل: ${email || '—'}`,
      wholesale ? `شرکت / فروشگاه: ${company} — شهر: ${city}` : '',
      '',
      message,
    ]
      .filter(Boolean)
      .join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[عدالت فیلتر] ' + (wholesale ? 'درخواست همکاری عمده' : subject || 'پیام از سایت'))}&body=${encodeURIComponent(body)}`;
  }
  const field = 'contact-form-field';
  return (
    <form onSubmit={submit} className={`contact-form ${wholesale ? 'wholesale-form' : ''}`}>
      <h2>{wholesale ? 'فرم درخواست همکاری عمده' : 'پیام خود را برای ما ارسال کنید'}</h2>
      {wholesale && <p>اطلاعات خود را وارد کنید تا کارشناسان ما در سریع‌ترین زمان تماس بگیرند.</p>}
      <div className="contact-form-grid">
        <label>
          <span className="sr-only">نام و نام خانوادگی</span>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام و نام خانوادگی *"
            autoComplete="name"
            required
          />
        </label>
        <label>
          <span className="sr-only">شماره تماس</span>
          <input
            className={field}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="شماره تماس *"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>
        {!wholesale && (
          <label>
            <span className="sr-only">ایمیل</span>
            <input
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ایمیل"
              type="email"
              autoComplete="email"
            />
          </label>
        )}
        {wholesale && (
          <>
            <label>
              <span className="sr-only">نام شرکت یا فروشگاه</span>
              <input
                className={field}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="نام شرکت / فروشگاه"
                autoComplete="organization"
                required
              />
            </label>
            <label>
              <span className="sr-only">شهر</span>
              <input
                className={field}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="شهر"
                autoComplete="address-level2"
                required
              />
            </label>
          </>
        )}
      </div>
      {!wholesale && (
        <label>
          <span className="sr-only">موضوع پیام</span>
          <input
            className={field}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="موضوع پیام"
          />
        </label>
      )}
      <label>
        <span className="sr-only">متن پیام</span>
        <textarea
          className={field}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={wholesale ? 'توضیحات / نوع همکاری مد نظر' : 'متن پیام شما'}
          rows={wholesale ? 2 : 3}
          required={!wholesale}
        />
      </label>
      <Button type="submit" size="lg">
        {wholesale ? 'ارسال درخواست' : 'ارسال پیام'}
      </Button>
      <p className="contact-send-hint">برای ارسال نهایی، نرم‌افزار ایمیل شما باز می‌شود.</p>
    </form>
  );
}
