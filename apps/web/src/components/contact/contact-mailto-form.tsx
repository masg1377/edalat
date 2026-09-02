'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

const SUBJECTS = [
  'سؤال عمومی',
  'خرید عمده',
  'تولید با برند اختصاصی',
  'پیگیری سفارش',
  'سایر',
];

const CONTACT_EMAIL = 'example@gmail.com';

/**
 * بدون بک‌اند اختصاصی (تصمیم مستند در `وضعیت-پیاده‌سازی.md`، فاز ۸): این فرم
 * پیامی را در دیتابیس ذخیره نمی‌کند — فقط با اطلاعات واردشده یک لینک
 * `mailto:` می‌سازد و نرم‌افزار ایمیل کاربر را باز می‌کند. برای کسی که سؤالی
 * دربارهٔ سفارش، عمده‌فروشی یا تولید دارد، مسیرهای اختصاصی‌تر
 * (`/product-request`, `/manufacturing/request`, `/dashboard`) وجود دارد که
 * واقعاً در Backend ثبت می‌شوند.
 */
export function ContactMailtoForm() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = [`نام: ${name || '—'}`, `راه تماس: ${contact || '—'}`, '', message].join('\n');
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `[عدالت فیلتر] ${subject}`,
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-card bg-white p-6 shadow-card md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm outline-none transition-colors focus:border-brand-500"
            placeholder="مثلاً علی رضایی"
          />
        </Field>

        <Field label="شماره تماس یا ایمیل">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className="ltr-num h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm outline-none transition-colors focus:border-brand-500"
            placeholder="09xxxxxxxxx"
          />
        </Field>
      </div>

      <Field label="موضوع">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm outline-none transition-colors focus:border-brand-500"
        >
          {SUBJECTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      <Field label="پیام">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-500"
          placeholder="پیام خود را بنویسید..."
        />
      </Field>

      <Button type="submit" size="lg" className="w-full">
        ارسال پیام از طریق ایمیل
      </Button>
      <p className="text-center text-xs text-ink-400">
        با ارسال، نرم‌افزار ایمیل شما باز می‌شود تا پیام را برای ما بفرستید.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink-700">{label}</span>
      {children}
    </label>
  );
}
