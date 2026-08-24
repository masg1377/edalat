import { ButtonLink } from '@/components/ui/button';
import { SearchBar } from '@/components/search/search-bar';

/**
 * PRD §6 — the hero has to communicate all four pillars at a glance:
 * sell, find the right part, produce under your own brand, and find a part
 * even when the customer knows neither its name nor its code.
 */
export function Hero() {
  return (
    <section className="relative isolate min-h-[560px] overflow-hidden bg-ink-700 pb-16 pt-28 md:min-h-[708px] md:pb-0 md:pt-[136px]">
      {/* Factory photograph. Replace with the exported Figma asset. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-ink-700 bg-cover bg-center"
        style={{ backgroundImage: 'var(--hero-image, none)' }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-ink-900/55" />

      <div className="container-page">
        <SearchBar className="mx-auto max-w-4xl" />

        <div className="mx-auto mt-16 max-w-3xl text-center text-white">
          <p className="text-lg font-bold text-brand-500 md:text-xl">
            کیفیت در تولید ، اعتماد در عملکرد
          </p>
          <h1 className="mt-4 text-2xl font-black leading-relaxed md:text-4xl">
            تولید و فروش قطعات یدکی و فیلتر خودرو
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-white/85 md:text-base">
            تامین کننده مستقیم قطعات یدکی با استانداردهای روز دنیا. تامین محصولات از کارخانه به
            بهترین قیمت برای مشتریان عمده و خرده.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <ButtonLink href="/products" size="lg" className="min-w-[220px]">
              خرید تکی
            </ButtonLink>
            <ButtonLink href="/wholesale" variant="muted" size="lg" className="min-w-[220px]">
              سفارش عمده
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
