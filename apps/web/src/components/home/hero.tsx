import { ButtonLink } from '@/components/ui/button';
import { SearchBar } from '@/components/search/search-bar';
import Image from 'next/image';
import { designAssets } from '@/lib/design-assets';

/**
 * PRD §6 — the hero has to communicate all four pillars at a glance:
 * sell, find the right part, produce under your own brand, and find a part
 * even when the customer knows neither its name nor its code.
 */
export function Hero() {
  return (
    <section className="home-hero relative isolate overflow-hidden bg-ink-700">
      <Image src={designAssets.factory} alt="" fill priority sizes="100vw" className="hero-photo" />
      <div aria-hidden className="hero-shade" />

      <div className="container-page">
        <SearchBar className="hero-search mx-auto" />

        <div className="hero-copy mx-auto text-center text-white">
          <p className="hero-eyebrow">کیفیت در تولید ، اعتماد در عملکرد</p>
          <h1>تولید و فروش قطعات یدکی و فیلتر خودرو</h1>
          <p className="hero-description mx-auto">
            تامین کننده مستقیم قطعات یدکی با استانداردهای روز دنیا. تامین محصولات از کارخانه به
            بهترین قیمت برای مشتریان عمده و خرده.
          </p>

          <div className="hero-actions flex justify-center">
            <ButtonLink href="/products" size="lg">
              خرید تکی
            </ButtonLink>
            <ButtonLink href="/wholesale" variant="muted" size="lg">
              سفارش عمده
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
