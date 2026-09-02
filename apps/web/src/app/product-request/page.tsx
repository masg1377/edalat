'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { FilePicker, IMAGE_TYPES, type PickedFile } from '@/components/upload/file-picker';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const MAX_FILES = 5;

/**
 * PRD §11 / §72 — "I don't know what this part is, here's a photo".
 *
 * Rule 5: in the MVP this is human-assisted. The customer sends photos and
 * whatever context they have; a specialist identifies, sources or quotes the
 * part. No login is required — forcing one here would kill the lead the whole
 * flow exists to capture (PRD §88).
 */
export default function ProductRequestPage() {
  const [images, setImages] = useState<PickedFile[]>([]);
  const [form, setForm] = useState({
    vehicleLabel: '',
    possibleName: '',
    brandGuess: '',
    possibleCode: '',
    quantity: '1',
    description: '',
    contactPhone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const submit = async () => {
    if (images.length === 0) {
      setError('حداقل یک تصویر از قطعه لازم است.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      // Uploads are not wired to object storage yet, so the images travel as
      // data URLs (see FilePicker) — the request payload already expects a
      // list of URLs, so swapping in a presigned S3 upload only changes how
      // FilePicker resolves each file.
      const response = await fetch(`${BASE_URL}/product-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((image) => image.dataUrl),
          vehicleLabel: form.vehicleLabel || undefined,
          possibleName: form.possibleName || undefined,
          brandGuess: form.brandGuess || undefined,
          possibleCode: form.possibleCode || undefined,
          quantity: Number(form.quantity) || 1,
          description: form.description || undefined,
          contactPhone: form.contactPhone || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message);
      }
      setReference(body.referenceNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود.');
    } finally {
      setPending(false);
    }
  };

  const field =
    'h-13 w-full rounded-pill border border-ink-200 bg-white px-5 py-3.5 text-sm text-ink-800 ' +
    'outline-none transition-colors focus:border-brand-500';

  if (reference) {
    return (
      <>
        <Header />
        <main className="container-page grid place-items-center py-24">
          <div className="w-full max-w-lg rounded-card bg-surface p-10 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500 text-2xl">
              ✓
            </span>
            <h1 className="mt-6 text-xl font-bold text-ink-800">درخواست شما ثبت شد</h1>
            <p className="mt-4 text-sm leading-8 text-ink-500">
              کد پیگیری: <b className="ltr-num text-ink-800">{reference}</b>
              <br />
              کارشناسان ما تصویر را بررسی می‌کنند و نتیجه را به شما اطلاع می‌دهند.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/requests"
                className="inline-flex h-14 items-center justify-center rounded-pill bg-brand-500 px-7 font-bold text-ink-900"
              >
                پیگیری در پنل کاربری
              </Link>
              <Link
                href="/products"
                className="inline-flex h-14 items-center justify-center rounded-pill bg-sand px-7 font-bold text-ink-800"
              >
                بازگشت به محصولات
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="container-page pb-16 pt-8">
        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">
          قطعه را نمی‌شناسید؟ عکسش را بفرستید
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-ink-500">
          لازم نیست نام یا کد فنی قطعه را بدانید. یک عکس واضح بفرستید — کارشناسان ما آن را شناسایی
          می‌کنند و به شما می‌گویند موجود است، قابل تأمین است، یا می‌توانیم تولیدش کنیم.
        </p>

        <form
          className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="order-2 lg:order-1">
            <fieldset className="rounded-card bg-surface p-6 md:p-7">
              <legend className="px-2 text-sm font-bold text-ink-800">اطلاعات تکمیلی (اختیاری)</legend>
              <p className="mb-6 text-xs leading-6 text-ink-500">
                هر چه بیشتر بدانیم، سریع‌تر قطعه را پیدا می‌کنیم.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <Labeled label="خودرو">
                  <input
                    value={form.vehicleLabel}
                    onChange={(e) => setForm({ ...form, vehicleLabel: e.target.value })}
                    placeholder="مثلاً پژو ۲۰۶ تیپ ۵"
                    className={field}
                  />
                </Labeled>

                <Labeled label="نام احتمالی قطعه">
                  <input
                    value={form.possibleName}
                    onChange={(e) => setForm({ ...form, possibleName: e.target.value })}
                    placeholder="مثلاً فیلتر روغن"
                    className={field}
                  />
                </Labeled>

                <Labeled label="برند">
                  <input
                    value={form.brandGuess}
                    onChange={(e) => setForm({ ...form, brandGuess: e.target.value })}
                    className={field}
                  />
                </Labeled>

                <Labeled label="کد روی قطعه">
                  <input
                    value={form.possibleCode}
                    onChange={(e) => setForm({ ...form, possibleCode: e.target.value })}
                    className={`${field} ltr-num text-start`}
                  />
                </Labeled>

                <Labeled label="تعداد موردنیاز">
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className={`${field} ltr-num text-start`}
                  />
                </Labeled>

                <Labeled label="شماره تماس">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className={`${field} ltr-num text-start`}
                  />
                </Labeled>

                <div className="sm:col-span-2">
                  <Labeled label="توضیحات">
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="هر نکته‌ای که به شناسایی قطعه کمک می‌کند…"
                      className="w-full rounded-card border border-ink-200 bg-white px-5 py-4 text-sm text-ink-800 outline-none transition-colors focus:border-brand-500"
                    />
                  </Labeled>
                </div>
              </div>
            </fieldset>
          </div>

          <div className="order-1 lg:order-2">
            <div className="rounded-card bg-surface p-6 md:p-7">
              <h2 className="text-sm font-bold text-ink-800">تصویر قطعه</h2>
              <p className="mt-2 text-xs text-ink-500">
                حداکثر {MAX_FILES} تصویر، هر کدام تا ۵ مگابایت. JPG، PNG یا WebP.
              </p>

              <FilePicker
                label="تصویر قطعه"
                hint="گرفتن عکس یا انتخاب از گالری"
                accept={IMAGE_TYPES}
                multiple
                maxFiles={MAX_FILES}
                value={images}
                onChange={setImages}
                className="mt-5"
              />

              {error && (
                <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full">
                {pending ? 'در حال ارسال…' : 'ثبت درخواست'}
              </Button>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-ink-600">{label}</span>
      {children}
    </label>
  );
}
