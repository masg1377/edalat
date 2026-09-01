'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Address } from '@edalat/shared';

import {
  AddressFormFields,
  EMPTY_ADDRESS_FORM,
  isAddressFormValid,
  type AddressFormState,
} from '@/components/account/address-form';
import { Button } from '@/components/ui/button';
import { AuthRequiredError, authFetch } from '@/lib/auth';

function toFormState(address: Address): AddressFormState {
  return {
    title: address.title,
    recipientName: address.recipientName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    postalCode: address.postalCode ?? '',
    line: address.line,
    isDefault: address.isDefault,
  };
}

/**
 * PRD §31/§34 — Dashboard → Addresses. `GET/POST/PATCH/DELETE /addresses`
 * shipped in phase 5 for checkout, which only ever creates one. This is the
 * management UI phase 5 left as a gap: edit and delete. Shares
 * `AddressFormFields` with `/checkout` instead of a second copy of the form.
 */
export default function DashboardAddressesPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    router.replace('/login?next=%2Fdashboard%2Faddresses');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch<Address[]>('/addresses');
      setAddresses(data);
      setLoadError(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'بارگذاری آدرس‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCreate = async () => {
    setCreatePending(true);
    setCreateError(null);
    try {
      const created = await authFetch<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...createForm, postalCode: createForm.postalCode || undefined }),
      });
      setAddresses((prev) => {
        const rest = (prev ?? []).map((a) => (created.isDefault ? { ...a, isDefault: false } : a));
        return [created, ...rest];
      });
      setCreating(false);
      setCreateForm(EMPTY_ADDRESS_FORM);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setCreateError(err instanceof Error ? err.message : 'ثبت آدرس ناموفق بود.');
    } finally {
      setCreatePending(false);
    }
  };

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setEditForm(toFormState(address));
    setEditError(null);
    setCreating(false);
  };

  const submitEdit = async () => {
    if (!editingId) return;
    setEditPending(true);
    setEditError(null);
    try {
      const updated = await authFetch<Address>(`/addresses/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...editForm, postalCode: editForm.postalCode || undefined }),
      });
      setAddresses((prev) =>
        (prev ?? []).map((a) => {
          if (a.id === updated.id) return updated;
          return updated.isDefault ? { ...a, isDefault: false } : a;
        }),
      );
      setEditingId(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setEditError(err instanceof Error ? err.message : 'ویرایش آدرس ناموفق بود.');
    } finally {
      setEditPending(false);
    }
  };

  const confirmDelete = async (id: string) => {
    setDeletePending(true);
    setDeleteError(null);
    try {
      await authFetch(`/addresses/${id}`, { method: 'DELETE' });
      // The backend promotes a new default when the deleted address was one —
      // simplest correct way to reflect that here is to just reload.
      await load();
      setConfirmDeleteId(null);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setDeleteError(err instanceof Error ? err.message : 'حذف آدرس ناموفق بود.');
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-card bg-surface" />
        <div className="h-32 animate-pulse rounded-card bg-surface" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-card bg-surface px-6 py-14 text-center">
        <p className="text-sm leading-8 text-ink-500">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 rounded-pill bg-brand-500 px-6 py-2.5 text-sm font-bold text-ink-900"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(addresses ?? []).map((address) =>
        editingId === address.id ? (
          <div key={address.id} className="rounded-card border border-ink-200 bg-white p-5">
            <AddressFormFields form={editForm} onChange={setEditForm} showDefaultToggle />
            {editError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                {editError}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                disabled={!isAddressFormValid(editForm) || editPending}
                onClick={() => void submitEdit()}
                className="flex-1"
              >
                {editPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
              </Button>
              <Button type="button" variant="muted" onClick={() => setEditingId(null)}>
                انصراف
              </Button>
            </div>
          </div>
        ) : (
          <div key={address.id} className="rounded-card bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-ink-800">{address.title}</span>
              {address.isDefault && (
                <span className="rounded-pill bg-sand px-3 py-0.5 text-[11px] text-ink-700">
                  پیش‌فرض
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-7 text-ink-500">
              {address.recipientName} · <span className="ltr-num">{address.phone}</span>
              <br />
              {address.province}، {address.city} — {address.line}
              {address.postalCode && (
                <>
                  {' '}
                  (کد پستی: <span className="ltr-num">{address.postalCode}</span>)
                </>
              )}
            </p>

            {confirmDeleteId === address.id ? (
              <div className="mt-4 rounded-xl bg-red-50 p-4">
                <p className="text-xs text-red-700">این آدرس حذف شود؟</p>
                {deleteError && <p className="mt-1 text-xs text-red-700">{deleteError}</p>}
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => void confirmDelete(address.id)}
                    className="rounded-pill bg-red-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {deletePending ? 'در حال حذف…' : 'بله، حذف شود'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-pill bg-white px-4 py-1.5 text-xs font-bold text-ink-700"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => startEdit(address)}
                  className="text-ink-700 underline-offset-4 hover:underline"
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(address.id)}
                  className="text-red-600 underline-offset-4 hover:underline"
                >
                  حذف
                </button>
              </div>
            )}
          </div>
        ),
      )}

      {!creating ? (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink-200 bg-white py-4 text-sm font-bold text-ink-700 transition-colors hover:border-brand-500"
        >
          + افزودن آدرس جدید
        </button>
      ) : (
        <div className="rounded-card border border-ink-200 bg-white p-5">
          <AddressFormFields
            form={createForm}
            onChange={setCreateForm}
            showDefaultToggle={(addresses ?? []).length > 0}
          />
          {createError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {createError}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <Button
              type="button"
              disabled={!isAddressFormValid(createForm) || createPending}
              onClick={() => void submitCreate()}
              className="flex-1"
            >
              {createPending ? 'در حال ثبت…' : 'ثبت آدرس'}
            </Button>
            <Button
              type="button"
              variant="muted"
              onClick={() => {
                setCreating(false);
                setCreateForm(EMPTY_ADDRESS_FORM);
              }}
            >
              انصراف
            </Button>
          </div>
        </div>
      )}

      {(addresses ?? []).length === 0 && !creating && (
        <p className="text-center text-sm text-ink-500">هنوز آدرسی ثبت نکرده‌اید.</p>
      )}
    </div>
  );
}
