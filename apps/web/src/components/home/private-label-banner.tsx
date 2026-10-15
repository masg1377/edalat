import Image from 'next/image';
import { ButtonLink } from '@/components/ui/button';
import { designAssets } from '@/lib/design-assets';
const PILLARS = [
  { title: 'طراحی بسته بندی اختصاصی', body: 'با استاندارد روز دنیا' },
  { title: 'تولید با برند شما', body: 'با کیفیت کارخانه ای' },
  { title: 'پشتیبانی فنی', body: 'مشاوره قبل و بعد خرید' },
];
export function PrivateLabelBanner() {
  return (
    <section className="private-section container-page">
      <div className="private-banner">
        <div className="private-copy">
          <h2>طراحی برند اختصاصی</h2>
          <p>طراحی، تولید و بسته بندی قطعات با برند شما</p>
          <ul className="private-pillars">
            {PILLARS.map(({ title, body }) => (
              <li key={title}>
                <Image src={designAssets.customization} alt="" width={63} height={69} />
                <span>
                  <b>{title}</b>
                  <span>{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <ButtonLink href="/manufacturing/request" className="private-cta">
            مشاوره و ثبت درخواست
          </ButtonLink>
        </div>
        <Image
          src={designAssets.packaging}
          alt="نمونه فیلترها و بسته‌بندی با برند اختصاصی"
          width={648}
          height={400}
          className="private-photo"
        />
      </div>
    </section>
  );
}
