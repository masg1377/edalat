'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * PRD §31/§34 — the address form fields, shared between the checkout wizard
 * (`/checkout`) and the Dashboard → Addresses tab (phase 6) so the two never
 * drift into two slightly-different forms for the same `Address` shape.
 */
export interface AddressFormState {
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  line: string;
  isDefault?: boolean;
}

export const EMPTY_ADDRESS_FORM: AddressFormState = {
  title: '',
  recipientName: '',
  phone: '',
  province: '',
  city: '',
  postalCode: '',
  line: '',
  isDefault: false,
};

export const addressFieldClass =
  'h-13 w-full rounded-pill border border-ink-200 bg-white px-5 py-3.5 text-sm text-ink-800 ' +
  'outline-none transition-colors focus:border-brand-500';

export function AddressLabeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-ink-600">{label}</span>
      {children}
    </label>
  );
}

export function isAddressFormValid(form: AddressFormState): boolean {
  return Boolean(
    form.title.trim() &&
      form.recipientName.trim() &&
      form.phone.trim() &&
      form.province.trim() &&
      form.city.trim() &&
      form.line.trim(),
  );
}

export function AddressFormFields({
  form,
  onChange,
  showDefaultToggle = false,
}: {
  form: AddressFormState;
  onChange: (form: AddressFormState) => void;
  /** Checkout auto-defaults the first saved address (backend rule); the
   * dashboard lets the user set the default explicitly when there's already
   * more than one. */
  showDefaultToggle?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AddressLabeled label="عنوان آدرس">
        <input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="مثلاً خانه، محل کار"
          className={addressFieldClass}
        />
      </AddressLabeled>
      <AddressLabeled label="نام گیرنده">
        <input
          value={form.recipientName}
          onChange={(e) => onChange({ ...form, recipientName: e.target.value })}
          className={addressFieldClass}
        />
      </AddressLabeled>
      <AddressLabeled label="شماره تماس گیرنده">
        <input
          type="tel"
          inputMode="numeric"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          placeholder="09xxxxxxxxx"
          className={cn(addressFieldClass, 'ltr-num text-start')}
        />
      </AddressLabeled>
      <AddressLabeled label="کد پستی (اختیاری)">
        <input
          value={form.postalCode}
          onChange={(e) => onChange({ ...form, postalCode: e.target.value })}
          className={cn(addressFieldClass, 'ltr-num text-start')}
        />
      </AddressLabeled>
      <AddressLabeled label="استان">
        <input
          value={form.province}
          onChange={(e) => onChange({ ...form, province: e.target.value })}
          className={addressFieldClass}
        />
      </AddressLabeled>
      <AddressLabeled label="شهر">
        <input
          value={form.city}
          onChange={(e) => onChange({ ...form, city: e.target.value })}
          className={addressFieldClass}
        />
      </AddressLabeled>
      <div className="sm:col-span-2">
        <AddressLabeled label="آدرس کامل">
          <textarea
            rows={3}
            value={form.line}
            onChange={(e) => onChange({ ...form, line: e.target.value })}
            placeholder="خیابان، کوچه، پلاک، واحد"
            className="w-full rounded-card border border-ink-200 bg-white px-5 py-4 text-sm text-ink-800 outline-none transition-colors focus:border-brand-500"
          />
        </AddressLabeled>
      </div>
      {showDefaultToggle && (
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isDefault ?? false}
            onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
            className="size-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs text-ink-600">تنظیم به‌عنوان آدرس پیش‌فرض</span>
        </label>
      )}
    </div>
  );
}
