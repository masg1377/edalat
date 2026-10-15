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
    let active = true;
    setModel('');
    if (!brandSlug) {
      setModels([]);
      setModel('');
      setLoadingModels(false);
      return;
    }
    setLoadingModels(true);
    api.vehicles
      .models(brandSlug)
      .then((items) => {
        if (active) setModels(items);
      })
      .catch(() => {
        if (active) setModels([]);
      })
      .finally(() => {
        if (active) setLoadingModels(false);
      });
    return () => {
      active = false;
    };
  }, [brandSlug]);

  const submit = () => {
    // A technical code is the most specific signal, so it wins outright.
    if (code.trim()) {
      router.push(`/products?q=${encodeURIComponent(code.trim())}`);
      return;
    }
    const params = new URLSearchParams();
    if (brandSlug) params.set('vehicleBrand', brandSlug);
    if (model) params.set('vehicleModel', model);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  };

  const field =
    'quick-field w-full border border-brand-500 bg-transparent text-sm text-ink-800 ' +
    'outline-none transition-colors focus:border-brand-600 disabled:bg-ink-50 disabled:text-ink-400';

  return (
    /* From md up the card overlaps the hero, as in the Figma layout. On small
       screens it sits below it — otherwise it covers the hero's CTAs. */
    <section className="quick-search relative z-20">
      <div className="quick-card">
        <div className="quick-heading">
          <div>
            <h2>جستجوی سریع</h2>
            <p>یک کد فنی ممکن است برای چندین خودرو مناسب باشد.</p>
          </div>
          <Logo size="md" className="quick-logo" />
        </div>

        <form
          className="quick-fields"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-ink-700">انتخاب برند</span>
            <select
              value={brandSlug}
              onChange={(event) => {
                setBrandSlug(event.target.value);
                setModel('');
              }}
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
              <option value="">{loadingModels ? 'در حال بارگذاری…' : 'مدل را انتخاب کنید'}</option>
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
              dir="auto"
              className={field}
            />
          </label>

          <Button type="submit" size="lg" className="quick-submit w-full">
            جستجو در محصولات
          </Button>
        </form>
      </div>
    </section>
  );
}
