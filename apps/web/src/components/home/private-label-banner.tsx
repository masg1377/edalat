import { ButtonLink } from '@/components/ui/button';
import { BoxIcon, HeadsetIcon, PercentIcon } from '@/components/ui/icons';

const PILLARS = [
  {
    icon: PercentIcon,
    title: 'طراحی بسته بندی اختصاصی',
    body: 'با استاندارد روز دنیا',
  },
  {
    icon: BoxIcon,
    title: 'تولید با برند شما',
    body: 'با کیفیت کارخانه ای',
  },
  {
    icon: HeadsetIcon,
    title: 'پشتیبانی فنی',
    body: 'مشاوره قبل و بعد خرید',
  },
];

/** PRD §27 — the B2B conversion block: turn a visitor into a production lead. */
export function PrivateLabelBanner() {
  return (
    <section className="container-page mt-24">
      <div className="relative overflow-hidden rounded-card bg-ink-600 p-8 text-white md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* Packaging photography sits on the start side in the Figma design. */}
          <div
            aria-hidden
            className="order-2 hidden h-64 rounded-card bg-ink-700/60 lg:order-2 lg:block"
            style={{ backgroundImage: 'var(--private-label-image, none)', backgroundSize: 'cover' }}
          />

          <div className="order-1 lg:order-1">
            <h2 className="text-xl font-bold text-brand-500 md:text-2xl">طراحی برند اختصاصی</h2>
            <p className="mt-3 text-sm text-white/80">
              طراحی ، تولید و بسته بندی قطعات با برند شما
            </p>

            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-card bg-ink-500">
                    <Icon className="size-6 text-white" />
                  </span>
                  <span>
                    <b className="block text-sm text-brand-500">{title}</b>
                    <span className="mt-1 block text-xs text-white/75">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <ButtonLink href="/manufacturing/request" size="lg" className="mt-9 w-full">
              مشاوره و ثبت درخواست
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
