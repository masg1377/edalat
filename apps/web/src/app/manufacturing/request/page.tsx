'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CategorySummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPES, FilePicker, IMAGE_TYPES, type PickedFile } from '@/components/upload/file-picker';
import { api } from '@/lib/api';
import { optionalAuthHeaderFresh } from '@/lib/auth';
import { cn } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** PRD §28 — six steps: customer → brand → product → reference/file →
 * description → review. Step 6 is UI-only; the backend DTO only mirrors
 * steps 1-5 (see `ManufacturingModule.CreateManufacturingRequestDto`). */
type StepId = 'customer' | 'brand' | 'product' | 'reference' | 'description' | 'review';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'customer', label: 'مشتری' },
  { id: 'brand', label: 'برند' },
  { id: 'product', label: 'محصول' },
  { id: 'reference', label: 'مرجع' },
  { id: 'description', label: 'توضیحات' },
  { id: 'review', label: 'بازبینی' },
];

const CONTACT_METHODS = ['تماس تلفنی', 'پیامک', 'واتساپ', 'ایمیل'];

interface FormState {
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  address: string;
  preferredContactMethod: string;
  brandName: string;
  productCategoryId: string;
  productType: string;
  productName: string;
  technicalCode: string;
  targetVehicles: string;
  quantity: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  contactName: '',
  companyName: '',
  phone: '',
  email: '',
  province: '',
  city: '',
  address: '',
  preferredContactMethod: '',
  brandName: '',
  productCategoryId: '',
  productType: '',
  productName: '',
  technicalCode: '',
  targetVehicles: '',
  quantity: '1',
  description: '',
};

const fieldClass =
  'h-13 w-full rounded-pill border border-ink-200 bg-white px-5 py-3.5 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500';
const textareaClass =
  'w-full rounded-card border border-ink-200 bg-white px-5 py-4 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500';

/**
 * PRD §3.3 / §27-28 — Private Label manufacturing request.
 *
 * "این درخواست Purchase محسوب نمی‌شود" (PRD §3.3): the create endpoint is
 * open to guests (PRD §88 — a lead should never be blocked behind a login),
 * so this page never redirects to `/login` the way `/checkout` does.
 */
export default function ManufacturingRequestPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [logo, setLogo] = useState<PickedFile[]>([]);
  const [packagingDesign, setPackagingDesign] = useState<PickedFile[]>([]);
  const [productImage, setProductImage] = useState<PickedFile[]>([]);
  const [sampleImage, setSampleImage] = useState<PickedFile[]>([]);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);

  const [stepIndex, setStepIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const [categories, setCategories] = useState<CategorySummary[] | null>(null);
  const [categoriesFailed, setCategoriesFailed] = useState(false);

  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.categories
      .list()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategoriesFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const step = STEPS[stepIndex].id;

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const validate = (target: StepId): string[] => {
    const errors: string[] = [];
    if (target === 'customer') {
      if (form.contactName.trim().length < 2) errors.push('نام و نام‌خانوادگی را وارد کنید.');
      if (form.phone.trim().length < 8) errors.push('شماره تماس معتبر وارد کنید.');
    }
    if (target === 'brand') {
      if (form.brandName.trim().length < 2) errors.push('نام برند را وارد کنید.');
    }
    if (target === 'product') {
      if (!form.productType.trim()) errors.push('نوع محصول را وارد کنید.');
      const quantity = Number(form.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        errors.push('تعداد موردنیاز باید حداقل ۱ عدد باشد.');
      }
    }
    return errors;
  };

  const goNext = () => {
    const errors = validate(step);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepErrors([]);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const jumpTo = (id: StepId) => {
    const targetIndex = STEPS.findIndex((s) => s.id === id);
    if (targetIndex < stepIndex) {
      setStepErrors([]);
      setStepIndex(targetIndex);
    }
  };

  const submit = async () => {
    // The review step can be reached by jumping back and forth between
    // earlier steps, so every required field is re-checked once more here
    // rather than trusting that `goNext` already caught everything.
    const errors = [...validate('customer'), ...validate('brand'), ...validate('product')];
    if (errors.length > 0) {
      setSubmitError(errors.join(' '));
      return;
    }

    setPending(true);
    setSubmitError(null);
    try {
      // Same documented workaround as `product-request` / `FilePicker`: no
      // object-storage service exists yet, so every file field travels as a
      // data URL directly in the JSON body.
      const authHeader = await optionalAuthHeaderFresh();
      const response = await fetch(`${BASE_URL}/manufacturing/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          contactName: form.contactName,
          companyName: form.companyName || undefined,
          phone: form.phone,
          email: form.email || undefined,
          province: form.province || undefined,
          city: form.city || undefined,
          address: form.address || undefined,
          preferredContactMethod: form.preferredContactMethod || undefined,
          brandName: form.brandName,
          logoUrl: logo[0]?.dataUrl,
          packagingDesignUrl: packagingDesign[0]?.dataUrl,
          productCategoryId: form.productCategoryId || undefined,
          productType: form.productType,
          productName: form.productName || undefined,
          technicalCode: form.technicalCode || undefined,
          targetVehicles: form.targetVehicles || undefined,
          quantity: Number(form.quantity) || 1,
          productImageUrl: productImage[0]?.dataUrl,
          sampleImageUrl: sampleImage[0]?.dataUrl,
          attachments: attachments.length > 0 ? attachments.map((a) => a.dataUrl) : undefined,
          description: form.description || undefined,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message);
      }
      setReference(body.referenceNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود.');
    } finally {
      setPending(false);
    }
  };

  if (reference) {
    return (
      <>
        <Header />
        <main className="container-page grid place-items-center py-24">
          <div className="w-full max-w-lg rounded-card bg-surface p-10 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500 text-2xl">
              ✓
            </span>
            <h1 className="mt-6 text-xl font-bold text-ink-800">درخواست تولید شما ثبت شد</h1>
            <p className="mt-4 text-sm leading-8 text-ink-500">
              کد پیگیری: <b className="ltr-num text-ink-800">{reference}</b>
              <br />
              کارشناسان ما درخواست شما را بررسی می‌کنند و نتیجهٔ امکان‌سنجی و استعلام قیمت را از همین
              مسیر و با شما در میان می‌گذارند.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/manufacturing-requests"
                className="inline-flex h-14 items-center justify-center rounded-pill bg-brand-500 px-7 font-bold text-ink-900"
              >
                پیگیری در پنل کاربری
              </Link>
              <Link
                href="/manufacturing"
                className="inline-flex h-14 items-center justify-center rounded-pill bg-sand px-7 font-bold text-ink-800"
              >
                بازگشت به صفحهٔ تولید
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
        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">ثبت درخواست تولید</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-ink-500">
          اطلاعات زیر را در چند مرحلهٔ ساده تکمیل کنید. برای ثبت درخواست نیازی به ورود به حساب کاربری
          نیست؛ اگر وارد حساب خود باشید، درخواست به پنل کاربری‌تان هم متصل می‌شود.
        </p>

        {/* Stepper */}
        <ol className="mt-8 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, index) => {
            const isDone = index < stepIndex;
            const isCurrent = index === stepIndex;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => jumpTo(s.id)}
                  disabled={index > stepIndex}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-pill px-4 font-bold transition-colors',
                    isCurrent
                      ? 'bg-brand-500 text-ink-900'
                      : isDone
                        ? 'bg-ink-600 text-white'
                        : 'cursor-not-allowed bg-surface text-ink-400',
                  )}
                >
                  <span className="ltr-num">{toPersianDigits(index + 1)}</span>
                  {s.label}
                </button>
                {index < STEPS.length - 1 && <span className="text-ink-300">←</span>}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 max-w-2xl">
          {step === 'customer' && <CustomerFields form={form} onChange={update} />}

          {step === 'brand' && (
            <BrandFields
              form={form}
              onChange={update}
              logo={logo}
              onLogoChange={setLogo}
              packagingDesign={packagingDesign}
              onPackagingDesignChange={setPackagingDesign}
            />
          )}

          {step === 'product' && (
            <ProductFields
              form={form}
              onChange={update}
              categories={categories}
              categoriesFailed={categoriesFailed}
            />
          )}

          {step === 'reference' && (
            <ReferenceFields
              productImage={productImage}
              onProductImageChange={setProductImage}
              sampleImage={sampleImage}
              onSampleImageChange={setSampleImage}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          )}

          {step === 'description' && <DescriptionFields form={form} onChange={update} />}

          {step === 'review' && (
            <ReviewStep
              form={form}
              logo={logo}
              packagingDesign={packagingDesign}
              productImage={productImage}
              sampleImage={sampleImage}
              attachments={attachments}
              categories={categories}
              onEdit={jumpTo}
            />
          )}

          {stepErrors.length > 0 && step !== 'review' && (
            <ul role="alert" className="mt-5 list-inside list-disc space-y-1 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {stepErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {submitError && step === 'review' && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="mt-8 flex gap-3">
            {stepIndex > 0 && (
              <Button type="button" variant="muted" onClick={goBack} className="flex-1">
                بازگشت
              </Button>
            )}
            {step !== 'review' ? (
              <Button type="button" onClick={goNext} className="flex-[2]">
                ادامه
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => void submit()} className="flex-[2]">
                {pending ? 'در حال ثبت…' : 'ثبت درخواست تولید'}
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ */

function StepCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-6 md:p-7">
      <h2 className="font-bold text-ink-800">{title}</h2>
      {hint && <p className="mt-2 text-xs leading-6 text-ink-500">{hint}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Labeled({
  label,
  optional = false,
  full = false,
  children,
}: {
  label: string;
  optional?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', full && 'sm:col-span-2')}>
      <span className="mb-2 block text-xs text-ink-600">
        {label}
        {optional && <span className="text-ink-400"> (اختیاری)</span>}
      </span>
      {children}
    </label>
  );
}

function CustomerFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <StepCard title="اطلاعات مشتری" hint="این اطلاعات برای تماس کارشناسان با شما استفاده می‌شود.">
      <Labeled label="نام و نام‌خانوادگی">
        <input
          value={form.contactName}
          onChange={(e) => onChange({ contactName: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="نام شرکت" optional>
        <input
          value={form.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="شماره تماس">
        <input
          type="tel"
          inputMode="numeric"
          value={form.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="09xxxxxxxxx"
          className={cn(fieldClass, 'ltr-num text-start')}
        />
      </Labeled>
      <Labeled label="ایمیل" optional>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={cn(fieldClass, 'ltr-num text-start')}
        />
      </Labeled>
      <Labeled label="استان" optional>
        <input
          value={form.province}
          onChange={(e) => onChange({ province: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="شهر" optional>
        <input
          value={form.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="آدرس" optional full>
        <textarea
          rows={3}
          value={form.address}
          onChange={(e) => onChange({ address: e.target.value })}
          className={textareaClass}
        />
      </Labeled>
      <div className="sm:col-span-2">
        <span className="mb-2 block text-xs text-ink-600">
          روش تماس ترجیحی <span className="text-ink-400">(اختیاری)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {CONTACT_METHODS.map((method) => {
            const selected = form.preferredContactMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => onChange({ preferredContactMethod: selected ? '' : method })}
                className={cn(
                  'rounded-pill border-2 px-4 py-2 text-xs font-bold transition-colors',
                  selected ? 'border-brand-500 bg-brand-500/10 text-ink-800' : 'border-ink-200 bg-white text-ink-600',
                )}
              >
                {method}
              </button>
            );
          })}
        </div>
      </div>
    </StepCard>
  );
}

function BrandFields({
  form,
  onChange,
  logo,
  onLogoChange,
  packagingDesign,
  onPackagingDesignChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  logo: PickedFile[];
  onLogoChange: (files: PickedFile[]) => void;
  packagingDesign: PickedFile[];
  onPackagingDesignChange: (files: PickedFile[]) => void;
}) {
  return (
    <StepCard title="برند شما" hint="نام و لوگوی برند اختصاصی که روی محصول و بسته‌بندی درج می‌شود.">
      <Labeled label="نام برند" full>
        <input
          value={form.brandName}
          onChange={(e) => onChange({ brandName: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <FilePicker
        label="لوگوی برند"
        hint="اختیاری — JPG، PNG یا WebP"
        accept={IMAGE_TYPES}
        value={logo}
        onChange={onLogoChange}
        className="sm:col-span-2 sm:max-w-xs"
      />
      <FilePicker
        label="طراحی بسته‌بندی (در صورت وجود)"
        hint="اختیاری — تصویر یا PDF"
        accept={DOCUMENT_TYPES}
        value={packagingDesign}
        onChange={onPackagingDesignChange}
        className="sm:col-span-2 sm:max-w-xs"
      />
    </StepCard>
  );
}

function ProductFields({
  form,
  onChange,
  categories,
  categoriesFailed,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  categories: CategorySummary[] | null;
  categoriesFailed: boolean;
}) {
  const categoriesLoading = categories === null && !categoriesFailed;

  return (
    <StepCard title="مشخصات محصول">
      <Labeled label="دسته‌بندی محصول" optional>
        <select
          value={form.productCategoryId}
          onChange={(e) => onChange({ productCategoryId: e.target.value })}
          disabled={categoriesLoading || categoriesFailed || (categories?.length ?? 0) === 0}
          className={cn(fieldClass, 'appearance-none disabled:opacity-60')}
        >
          <option value="">
            {categoriesLoading
              ? 'در حال بارگذاری دسته‌بندی‌ها…'
              : categoriesFailed || (categories?.length ?? 0) === 0
                ? 'دسته‌بندی در دسترس نیست'
                : 'بدون دسته‌بندی مشخص'}
          </option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="نوع محصول">
        <input
          value={form.productType}
          onChange={(e) => onChange({ productType: e.target.value })}
          placeholder="مثلاً فیلتر روغن"
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="نام محصول" optional>
        <input
          value={form.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="کد فنی محصول" optional>
        <input
          value={form.technicalCode}
          onChange={(e) => onChange({ technicalCode: e.target.value })}
          className={cn(fieldClass, 'ltr-num text-start')}
        />
      </Labeled>
      <Labeled label="خودروهای هدف" optional full>
        <input
          value={form.targetVehicles}
          onChange={(e) => onChange({ targetVehicles: e.target.value })}
          placeholder="مثلاً پژو ۲۰۶، پراید ۱۳۱"
          className={fieldClass}
        />
      </Labeled>
      <Labeled label="تعداد موردنیاز">
        <input
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          className={cn(fieldClass, 'ltr-num text-start')}
        />
      </Labeled>
    </StepCard>
  );
}

function ReferenceFields({
  productImage,
  onProductImageChange,
  sampleImage,
  onSampleImageChange,
  attachments,
  onAttachmentsChange,
}: {
  productImage: PickedFile[];
  onProductImageChange: (files: PickedFile[]) => void;
  sampleImage: PickedFile[];
  onSampleImageChange: (files: PickedFile[]) => void;
  attachments: PickedFile[];
  onAttachmentsChange: (files: PickedFile[]) => void;
}) {
  return (
    <div className="rounded-card bg-surface p-6 md:p-7">
      <h2 className="font-bold text-ink-800">مرجع و فایل‌ها</h2>
      <p className="mt-2 text-xs leading-6 text-ink-500">
        همهٔ فیلدهای این مرحله اختیاری‌اند؛ هر چه بیشتر بفرستید، امکان‌سنجی سریع‌تر انجام می‌شود.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FilePicker
          label="تصویر محصول"
          hint="اختیاری"
          accept={IMAGE_TYPES}
          value={productImage}
          onChange={onProductImageChange}
        />
        <FilePicker
          label="تصویر نمونه"
          hint="اختیاری"
          accept={IMAGE_TYPES}
          value={sampleImage}
          onChange={onSampleImageChange}
        />
        <FilePicker
          label="پیوست‌ها"
          hint="اختیاری — حداکثر ۵ فایل، تصویر یا PDF"
          accept={DOCUMENT_TYPES}
          multiple
          maxFiles={5}
          value={attachments}
          onChange={onAttachmentsChange}
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}

function DescriptionFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="rounded-card bg-surface p-6 md:p-7">
      <h2 className="font-bold text-ink-800">توضیحات تکمیلی</h2>
      <p className="mt-2 text-xs leading-6 text-ink-500">
        هر نکتهٔ دیگری دربارهٔ محصول، برند یا شرایط سفارش که کمک می‌کند.
      </p>
      <textarea
        rows={6}
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="توضیحات دلخواه…"
        className={cn(textareaClass, 'mt-5')}
      />
    </div>
  );
}

function ReviewStep({
  form,
  logo,
  packagingDesign,
  productImage,
  sampleImage,
  attachments,
  categories,
  onEdit,
}: {
  form: FormState;
  logo: PickedFile[];
  packagingDesign: PickedFile[];
  productImage: PickedFile[];
  sampleImage: PickedFile[];
  attachments: PickedFile[];
  categories: CategorySummary[] | null;
  onEdit: (step: StepId) => void;
}) {
  const categoryName = categories?.find((c) => c.id === form.productCategoryId)?.name;
  const fileCount = [logo, packagingDesign, productImage, sampleImage].filter((f) => f.length > 0).length + attachments.length;

  return (
    <div className="space-y-4">
      <ReviewSection title="مشتری" onEdit={() => onEdit('customer')}>
        <ReviewRow label="نام" value={form.contactName} />
        <ReviewRow label="شرکت" value={form.companyName} />
        <ReviewRow label="تماس" value={form.phone} ltr />
        <ReviewRow label="ایمیل" value={form.email} ltr />
        <ReviewRow label="آدرس" value={[form.province, form.city, form.address].filter(Boolean).join('، ')} />
        <ReviewRow label="روش تماس ترجیحی" value={form.preferredContactMethod} />
      </ReviewSection>

      <ReviewSection title="برند" onEdit={() => onEdit('brand')}>
        <ReviewRow label="نام برند" value={form.brandName} />
        <ReviewRow label="لوگو" value={logo.length > 0 ? 'بارگذاری شد' : 'ندارد'} />
        <ReviewRow label="طرح بسته‌بندی" value={packagingDesign.length > 0 ? 'بارگذاری شد' : 'ندارد'} />
      </ReviewSection>

      <ReviewSection title="محصول" onEdit={() => onEdit('product')}>
        <ReviewRow label="دسته‌بندی" value={categoryName} />
        <ReviewRow label="نوع محصول" value={form.productType} />
        <ReviewRow label="نام محصول" value={form.productName} />
        <ReviewRow label="کد فنی" value={form.technicalCode} ltr />
        <ReviewRow label="خودروهای هدف" value={form.targetVehicles} />
        <ReviewRow label="تعداد" value={toPersianDigits(form.quantity)} />
      </ReviewSection>

      <ReviewSection title="مرجع و فایل‌ها" onEdit={() => onEdit('reference')}>
        <ReviewRow
          label="فایل‌های ضمیمه"
          value={fileCount > 0 ? `${toPersianDigits(fileCount)} فایل` : 'فایلی ضمیمه نشده'}
        />
      </ReviewSection>

      <ReviewSection title="توضیحات" onEdit={() => onEdit('description')}>
        <ReviewRow label="توضیحات" value={form.description} full />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink-800">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-bold text-brand-600 underline-offset-4 hover:underline">
          ویرایش
        </button>
      </div>
      <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value, ltr = false, full = false }: { label: string; value?: string; ltr?: boolean; full?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', full && 'sm:col-span-2')}>
      <dt className="text-[11px] text-ink-500">{label}</dt>
      <dd className={cn('text-sm text-ink-800', ltr && 'ltr-num text-start')}>{value?.trim() || '—'}</dd>
    </div>
  );
}
