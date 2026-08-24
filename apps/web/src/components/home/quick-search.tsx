'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface VehicleBrandOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * PRD §25 — the shared vehicle selector, in its compact home-page form.
 * Brand → model narrows the catalogue; the technical-code field is a shortcut
 * for the expert user who already knows the part number (PRD §87).
 */
export function QuickSearch({ brands }: { brands: VehicleBrandOption[] }) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [code, setCode] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (!brandSlug) {
      setModels([]);
      setModel('');
      return;
    }
    setLoadingModels(true);
    api.vehicles
      .models(brandSlug)
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [brandSlug]);

  const submit = () => {
    // A technical code is the most specific signal, so it wins outright.
    if (code.trim()) {
      router.push(`/search?q=${encodeURIComponent(code.trim())}`);
      return;
    }
    const params = new URLSearchParams();
    if (brandSlug) params.set('vehicleBrand', brandSlug);
    if (model) params.set('vehicleModel', model);
    router.push(`/store?${params.toString()}`);
  };

  const field =
    'h-14 w-full rounded-pill border border-brand-500 bg-white px-5 text-sm text-ink-800 ' +
    'outline-none transition-colors focus:border-brand-600 disabled:bg-ink-50 disabled:text-ink-400';

  return (
    /* From md up the card overlaps the hero, as in the Figma layout. On small
       screens it sits below it — otherwise it covers the hero's CTAs. */
    <section className="container-page relative z-20 mt-10 md:-mt-28">
      <div className="rounded-card bg-surface-soft p-7 shadow-card md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-md">
            <h2 className="text-xl font-bold text-ink-800">جستجوی سریع</h2>
            <p className="mt-3 text-sm text-ink-500">
              یک کد فنی ممکن است برای چندین خودرو مناسب باشد.
            </p>
          </div>
          <Logo size="md" className="hidden shrink-0 lg:block" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm text-ink-700">انتخاب برند</span>
            <select
              value={brandSlug}
              onChange={(event) => setBrandSlug(event.target.value)}
              className={field}
            >
              <option value="">برند خودرو</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-ink-700">مدل خودرو</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={!brandSlug || loadingModels}
              className={field}
            >
              <option value="">
                {loadingModels ? 'در حال بارگذاری…' : 'مدل را انتخاب کنید'}
              </option>
              {models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-ink-700">کد فنی</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
              placeholder="کد فنی را وارد کنید"
              className={`${field} ltr-num text-start`}
            />
          </label>

          <Button onClick={submit} size="lg" className="h-14 w-full">
            جستجو در محصولات
          </Button>
        </div>
      </div>
    </section>
  );
}
