'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Address, Cart, OrderDetail } from '@edalat/shared';
import { formatToman, toPersianDigits } from '@edalat/shared';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { Button, ButtonLink } from '@/components/ui/button';
import { CartIcon } from '@/components/ui/icons';
import { AuthRequiredError, authFetch, getSession } from '@/lib/auth';
import { productImage } from '@/lib/media';

/**
 * PRD §34 — Cart Review → Address → Shipping → Payment → Confirmation.
 * "Authentication" is handled up front (redirect to /login) rather than as a
 * step of its own, matching how /cart already gates on session.
 *
 * PRD §90.6 decision (۱۴۰۵/۰۶/۱۰) — payment is Mock/Manual for the MVP, no
 * real gateway is wired. Every payment-facing string on this page says so
 * explicitly so nobody mistakes it for a real transaction.
 */
type Step = 'address' | 'shipping' | 'review';

interface ShippingMethod {
  id: string;
  label: string;
  description: string;
}

/** No backend for this — PRD §34 only asks for "a simple fixed list". */
const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'standard', label: 'پست پیشتاز', description: 'ارسال طی ۲ تا ۴ روز کاری' },
  { id: 'express', label: 'تیپاکس (ارسال سریع)', description: 'ارسال طی ۱ تا ۲ روز کاری' },
  { id: 'pickup', label: 'تحویل حضوری از انبار عدالت فیلتر', description: 'هماهنگی تلفنی پس از ثبت سفارش' },
];

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'address', label: 'آدرس' },
  { id: 'shipping', label: 'روش ارسال' },
  { id: 'review', label: 'بازبینی و پرداخت' },
];

interface AddressFormState {
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  line: string;
}

const EMPTY_ADDRESS_FORM: AddressFormState = {
  title: '',
  recipientName: '',
  phone: '',
  province: '',
  city: '',
  postalCode: '',
  line: '',
};

const field =
  'h-13 w-full rounded-pill border border-ink-200 bg-white px-5 py-3.5 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500';

export default function CheckoutPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('address');

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [addressPending, setAddressPending] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);

  const [shippingMethodId, setShippingMethodId] = useState(SHIPPING_METHODS[0].id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    router.replace(`/login?next=${encodeURIComponent('/checkout')}`);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cartData, addressList] = await Promise.all([
        authFetch<Cart>('/cart'),
        authFetch<Address[]>('/addresses'),
      ]);
      setCart(cartData);
      setAddresses(addressList);
      const preferred = addressList.find((a) => a.isDefault) ?? addressList[0];
      if (preferred) setSelectedAddressId(preferred.id);
      else setShowAddressForm(true);
      setLoadError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'بارگذاری اطلاعات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    if (!getSession()) {
      redirectToLogin();
      return;
    }
    void load();
    // Runs once per visit — `load` and `redirectToLogin` are stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAddress = async () => {
    setAddressPending(true);
    setAddressFormError(null);
    try {
      const created = await authFetch<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          ...addressForm,
          postalCode: addressForm.postalCode || undefined,
        }),
      });
      setAddresses((prev) => {
        const rest = (prev ?? []).map((a) => (created.isDefault ? { ...a, isDefault: false } : a));
        return [created, ...rest];
      });
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setAddressFormError(err instanceof Error ? err.message : 'ثبت آدرس ناموفق بود.');
    } finally {
      setAddressPending(false);
    }
  };

  const submitCheckout = async () => {
    if (!selectedAddressId) return;
    setCheckoutPending(true);
    setCheckoutError(null);
    try {
      const shippingLabel =
        SHIPPING_METHODS.find((m) => m.id === shippingMethodId)?.label ?? shippingMethodId;
      const created = await authFetch<OrderDetail>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ addressId: selectedAddressId, shippingMethod: shippingLabel }),
      });
      setOrder(created);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      // PRD §75 — surfaces the exact backend message (e.g. "موجودی «...» کافی
      // نیست."), never a generic "something went wrong".
      setCheckoutError(err instanceof Error ? err.message : 'ثبت سفارش ناموفق بود.');
    } finally {
      setCheckoutPending(false);
    }
  };

  const confirmMockPayment = async () => {
    if (!order) return;
    setPaymentPending(true);
    setPaymentError(null);
    try {
      await authFetch<OrderDetail>(`/orders/${order.id}/confirm-mock-payment`, { method: 'POST' });
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setPaymentError(err instanceof Error ? err.message : 'شبیه‌سازی پرداخت ناموفق بود.');
    } finally {
      setPaymentPending(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-full bg-surface" />
            <div className="h-64 animate-pulse rounded-card bg-surface" />
            <div className="h-40 animate-pulse rounded-card bg-surface" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div role="alert" className="mx-auto max-w-lg rounded-card bg-surface px-6 py-16 text-center">
            <h1 className="text-lg font-bold text-ink-800">اطلاعات پرداخت بارگذاری نشد</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-ink-500">{loadError}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => void load()}>
                تلاش دوباره
              </Button>
              <ButtonLink href="/cart" variant="muted" size="lg">
                بازگشت به سبد خرید
              </ButtonLink>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Header />
        <main className="container-page pb-16 pt-8">
          <div className="mx-auto max-w-lg rounded-card bg-surface px-6 py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-white">
              <CartIcon className="size-8 text-ink-400" aria-hidden />
            </span>
            <h1 className="mt-6 text-lg font-bold text-ink-800">سبد خرید شما خالی است</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-8 text-ink-500">
              برای ادامه خرید، ابتدا محصولی به سبد خود اضافه کنید.
            </p>
            <ButtonLink href="/products" size="lg" className="mt-8">
              مشاهده محصولات
            </ButtonLink>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId) ?? null;
  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === shippingMethodId)!;

  return (
    <>
      <Header cartCount={cart.items.reduce((sum, i) => sum + i.quantity, 0)} />

      <main className="container-page pb-16 pt-8">
        <h1 className="text-2xl font-black text-ink-800 md:text-3xl">تکمیل خرید</h1>

        {/* Stepper */}
        <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, index) => {
            const isDone = STEPS.findIndex((x) => x.id === step) > index || order !== null;
            const isCurrent = s.id === step && !order;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={
                    'flex h-8 items-center gap-2 rounded-pill px-4 font-bold ' +
                    (isCurrent
                      ? 'bg-brand-500 text-ink-900'
                      : isDone
                        ? 'bg-ink-600 text-white'
                        : 'bg-surface text-ink-500')
                  }
                >
                  <span className="ltr-num">{toPersianDigits(index + 1)}</span>
                  {s.label}
                </span>
                {index < STEPS.length - 1 && <span className="text-ink-300">←</span>}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {order ? (
              <MockPaymentPanel
                order={order}
                pending={paymentPending}
                error={paymentError}
                onConfirm={() => void confirmMockPayment()}
              />
            ) : step === 'address' ? (
              <AddressStep
                addresses={addresses ?? []}
                selectedAddressId={selectedAddressId}
                onSelect={setSelectedAddressId}
                showForm={showAddressForm}
                onToggleForm={() => setShowAddressForm((v) => !v)}
                form={addressForm}
                onFormChange={setAddressForm}
                onSubmitForm={() => void submitAddress()}
                pending={addressPending}
                formError={addressFormError}
                onNext={() => setStep('shipping')}
              />
            ) : step === 'shipping' ? (
              <ShippingStep
                selectedId={shippingMethodId}
                onSelect={setShippingMethodId}
                onBack={() => setStep('address')}
                onNext={() => setStep('review')}
              />
            ) : (
              <ReviewStep
                cart={cart}
                address={selectedAddress}
                shipping={selectedShipping}
                pending={checkoutPending}
                error={checkoutError}
                onBack={() => setStep('shipping')}
                onSubmit={() => void submitCheckout()}
              />
            )}
          </div>

          <OrderSummaryAside cart={cart} order={order} />
        </div>
      </main>

      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ */

function AddressStep({
  addresses,
  selectedAddressId,
  onSelect,
  showForm,
  onToggleForm,
  form,
  onFormChange,
  onSubmitForm,
  pending,
  formError,
  onNext,
}: {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
  showForm: boolean;
  onToggleForm: () => void;
  form: AddressFormState;
  onFormChange: (form: AddressFormState) => void;
  onSubmitForm: () => void;
  pending: boolean;
  formError: string | null;
  onNext: () => void;
}) {
  const canSubmitForm =
    form.title.trim() && form.recipientName.trim() && form.phone.trim() && form.province.trim() &&
    form.city.trim() && form.line.trim();

  return (
    <div className="rounded-card bg-surface p-6 md:p-7">
      <h2 className="font-bold text-ink-800">آدرس تحویل سفارش</h2>

      {addresses.length > 0 && (
        <ul className="mt-5 space-y-3">
          {addresses.map((address) => {
            const selected = address.id === selectedAddressId;
            return (
              <li key={address.id}>
                <button
                  type="button"
                  onClick={() => onSelect(address.id)}
                  className={
                    'w-full rounded-card border-2 bg-white p-4 text-start transition-colors ' +
                    (selected ? 'border-brand-500' : 'border-transparent hover:border-ink-200')
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink-800">{address.title}</span>
                    {address.isDefault && (
                      <span className="rounded-pill bg-sand px-3 py-0.5 text-[11px] text-ink-700">
                        پیش‌فرض
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-7 text-ink-500">
                    {address.recipientName} ·{' '}
                    <span className="ltr-num">{address.phone}</span>
                    <br />
                    {address.province}، {address.city} — {address.line}
                    {address.postalCode && (
                      <>
                        {' '}
                        (کد پستی: <span className="ltr-num">{address.postalCode}</span>)
                      </>
                    )}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={onToggleForm}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink-200 bg-white py-4 text-sm font-bold text-ink-700 transition-colors hover:border-brand-500"
        >
          + افزودن آدرس جدید
        </button>
      ) : (
        <div className="mt-5 rounded-card border border-ink-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="عنوان آدرس">
              <input
                value={form.title}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="مثلاً خانه، محل کار"
                className={field}
              />
            </Labeled>
            <Labeled label="نام گیرنده">
              <input
                value={form.recipientName}
                onChange={(e) => onFormChange({ ...form, recipientName: e.target.value })}
                className={field}
              />
            </Labeled>
            <Labeled label="شماره تماس گیرنده">
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                placeholder="09xxxxxxxxx"
                className={`${field} ltr-num text-start`}
              />
            </Labeled>
            <Labeled label="کد پستی (اختیاری)">
              <input
                value={form.postalCode}
                onChange={(e) => onFormChange({ ...form, postalCode: e.target.value })}
                className={`${field} ltr-num text-start`}
              />
            </Labeled>
            <Labeled label="استان">
              <input
                value={form.province}
                onChange={(e) => onFormChange({ ...form, province: e.target.value })}
                className={field}
              />
            </Labeled>
            <Labeled label="شهر">
              <input
                value={form.city}
                onChange={(e) => onFormChange({ ...form, city: e.target.value })}
                className={field}
              />
            </Labeled>
            <div className="sm:col-span-2">
              <Labeled label="آدرس کامل">
                <textarea
                  rows={3}
                  value={form.line}
                  onChange={(e) => onFormChange({ ...form, line: e.target.value })}
                  placeholder="خیابان، کوچه، پلاک، واحد"
                  className="w-full rounded-card border border-ink-200 bg-white px-5 py-4 text-sm text-ink-800 outline-none transition-colors focus:border-brand-500"
                />
              </Labeled>
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              type="button"
              disabled={!canSubmitForm || pending}
              onClick={onSubmitForm}
              className="flex-1"
            >
              {pending ? 'در حال ثبت…' : 'ثبت آدرس'}
            </Button>
            {addresses.length > 0 && (
              <Button type="button" variant="muted" onClick={onToggleForm}>
                انصراف
              </Button>
            )}
          </div>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        disabled={!selectedAddressId}
        onClick={onNext}
        className="mt-6 w-full"
      >
        ادامه
      </Button>
    </div>
  );
}

function ShippingStep({
  selectedId,
  onSelect,
  onBack,
  onNext,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="rounded-card bg-surface p-6 md:p-7">
      <h2 className="font-bold text-ink-800">روش ارسال</h2>
      <p className="mt-2 text-xs leading-6 text-ink-500">
        هزینه ارسال در این نسخه رایگان است و در فاکتور نهایی محاسبه می‌شود.
      </p>

      <ul className="mt-5 space-y-3">
        {SHIPPING_METHODS.map((method) => {
          const selected = method.id === selectedId;
          return (
            <li key={method.id}>
              <button
                type="button"
                onClick={() => onSelect(method.id)}
                className={
                  'w-full rounded-card border-2 bg-white p-4 text-start transition-colors ' +
                  (selected ? 'border-brand-500' : 'border-transparent hover:border-ink-200')
                }
              >
                <span className="font-bold text-ink-800">{method.label}</span>
                <p className="mt-1 text-xs text-ink-500">{method.description}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="muted" onClick={onBack} className="flex-1">
          بازگشت
        </Button>
        <Button type="button" onClick={onNext} className="flex-[2]">
          ادامه
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  cart,
  address,
  shipping,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  cart: Cart;
  address: Address | null;
  shipping: ShippingMethod;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-surface p-6 md:p-7">
        <h2 className="font-bold text-ink-800">بازبینی سفارش</h2>

        <ul className="mt-5 divide-y divide-ink-200">
          {cart.items.map((item) => {
            const image = productImage(item.product.mainImageUrl);
            return (
              <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="64px"
                    className={image.isPlaceholder ? 'object-contain p-3 opacity-60' : 'object-contain p-2'}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-800">{item.product.name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    <span className="ltr-num">{toPersianDigits(item.quantity)}</span> عدد ×{' '}
                    <span className="ltr-num">{formatToman(item.unitPrice)}</span> تومان
                  </p>
                </div>
                <p className="shrink-0 font-bold text-ink-800">
                  <span className="ltr-num">{formatToman(item.lineTotal)}</span>
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-xl bg-white p-4 text-sm">
          <p className="font-bold text-ink-800">آدرس تحویل</p>
          {address ? (
            <p className="mt-1 text-xs leading-7 text-ink-500">
              {address.recipientName} · <span className="ltr-num">{address.phone}</span>
              <br />
              {address.province}، {address.city} — {address.line}
            </p>
          ) : (
            <p className="mt-1 text-xs text-red-600">آدرسی انتخاب نشده است.</p>
          )}
          <p className="mt-3 font-bold text-ink-800">روش ارسال</p>
          <p className="mt-1 text-xs text-ink-500">{shipping.label}</p>
        </div>
      </div>

      <div className="rounded-card border border-brand-500/40 bg-brand-500/10 p-5 text-xs leading-7 text-ink-700">
        <b>محیط آزمایشی/دمو:</b> پرداخت این سایت هنوز به هیچ درگاه بانکی واقعی وصل نیست. با زدن دکمهٔ
        زیر فقط یک سفارش ثبت می‌شود و در مرحلهٔ بعد پرداخت به‌صورت شبیه‌سازی‌شده تأیید می‌گردد — هیچ
        مبلغی از حساب شما کسر نخواهد شد.
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="muted" onClick={onBack} disabled={pending} className="flex-1">
          بازگشت
        </Button>
        <Button type="button" onClick={onSubmit} disabled={pending || !address} className="flex-[2]">
          {pending ? 'در حال ثبت سفارش…' : 'ثبت سفارش'}
        </Button>
      </div>
    </div>
  );
}

function MockPaymentPanel({
  order,
  pending,
  error,
  onConfirm,
}: {
  order: OrderDetail;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-surface p-6 text-center md:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-500 text-xl">
          ✓
        </span>
        <h2 className="mt-5 text-lg font-bold text-ink-800">سفارش شما ثبت شد</h2>
        <p className="mt-2 text-sm text-ink-500">
          شماره سفارش: <b className="ltr-num text-ink-800">{order.orderNumber}</b>
        </p>
        <p className="mt-5 text-2xl font-black text-ink-800">
          <span className="ltr-num">{formatToman(order.grandTotal)}</span>
          <span className="ms-1 text-sm font-normal text-ink-500">تومان</span>
        </p>
      </div>

      <div className="rounded-card border-2 border-dashed border-brand-500/60 bg-brand-500/10 p-6 text-center">
        <p className="text-sm font-bold text-ink-800">این یک درگاه پرداخت واقعی نیست</p>
        <p className="mx-auto mt-2 max-w-md text-xs leading-7 text-ink-600">
          عدالت فیلتر در حال حاضر به درگاه بانکی متصل نیست. با زدن دکمهٔ زیر، پرداخت به‌صورت
          آزمایشی/دمو تأیید می‌شود تا بتوانید مسیر ثبت سفارش را کامل ببینید — هیچ مبلغ واقعی‌ای جابه‌جا
          نمی‌شود.
        </p>

        {error && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </p>
        )}

        <Button type="button" size="lg" disabled={pending} onClick={onConfirm} className="mt-5">
          {pending ? 'در حال شبیه‌سازی پرداخت…' : 'شبیه‌سازی پرداخت (دمو)'}
        </Button>
      </div>
    </div>
  );
}

function OrderSummaryAside({ cart, order }: { cart: Cart; order: OrderDetail | null }) {
  const subtotal = order?.subtotal ?? cart.subtotal;
  const shippingTotal = order?.shippingTotal ?? cart.shippingTotal;
  const grandTotal = order?.grandTotal ?? cart.grandTotal;

  return (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="rounded-card bg-surface p-6">
        <h2 className="font-bold text-ink-800">خلاصه مبلغ</h2>
        <dl className="mt-5 space-y-3.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-500">جمع مبلغ کالاها</dt>
            <dd className="text-ink-800">
              <span className="ltr-num">{formatToman(subtotal)}</span>
              <span className="ms-1 text-xs text-ink-500">تومان</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-500">هزینه ارسال</dt>
            <dd className="text-ink-800">
              {shippingTotal > 0 ? (
                <>
                  <span className="ltr-num">{formatToman(shippingTotal)}</span>
                  <span className="ms-1 text-xs text-ink-500">تومان</span>
                </>
              ) : (
                'رایگان'
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-5">
          <span className="font-bold text-ink-800">مبلغ قابل پرداخت</span>
          <span className="text-lg font-black text-ink-800">
            <span className="ltr-num">{formatToman(grandTotal)}</span>
            <span className="ms-1 text-xs font-normal text-ink-500">تومان</span>
          </span>
        </div>
        <Link
          href="/cart"
          className="mt-5 block text-center text-sm text-ink-500 underline-offset-4 hover:underline"
        >
          بازگشت به سبد خرید
        </Link>
      </div>
    </aside>
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
