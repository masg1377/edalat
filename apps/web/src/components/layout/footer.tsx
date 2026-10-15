import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { designAssets } from '@/lib/design-assets';
import { Logo } from './logo';
const COLUMNS = [
  {
    title: 'دسترسی سریع',
    links: [
      { href: '/products', label: 'محصولات' },
      { href: '/brands', label: 'برند ها' },
      { href: '/manufacturing', label: 'خدمات اختصاصی' },
      { href: '/manufacturing/request', label: 'سفارشی سازی' },
      { href: '/contact', label: 'تماس با ما' },
    ],
  },
  {
    title: 'خدمات مشتریان',
    links: [
      { href: '/contact', label: 'پرسش های متداول' },
      { href: '/wholesale', label: 'شرایط خرید و ارسال' },
      { href: '/contact', label: 'ضمانت و بازگشت کالا' },
      { href: '/contact', label: 'حریم خصوصی' },
      { href: '/contact', label: 'گارانتی محصولات' },
    ],
  },
];
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-card container-page">
        <div className="footer-consultation">
          <div className="consultation-copy">
            <div className="consultation-art-wrap">
              <Image
                src={designAssets.consultation}
                alt=""
                width={151}
                height={151}
                className="consultation-art"
              />
            </div>
            <div>
              <h2>نیاز به مشاوره یا استعلام قیمت دارید؟</h2>
              <p>کارشناسان ما آماده پاسخگویی به سوالات شما در سریع‌ترین زمان هستند.</p>
            </div>
          </div>
          <div className="consultation-actions">
            <ButtonLink href="/contact" variant="dark">
              در خواست مشاوره
            </ButtonLink>
            <ButtonLink href="tel:09111234567" className="ltr-num">
              09111234567
            </ButtonLink>
          </div>
        </div>
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo size="md" />
            <p>
              تولیدکننده و تأمین‌کننده قطعات یدکی خودرو
              <br />
              تأمین مستقیم از کارخانه با تضمین کیفیت و قیمت رقابت
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3>اطلاعات تماس</h3>
            <ul>
              <li>مازندران، ساری</li>
              <li>
                <a href="tel:09111234567" className="ltr-num">
                  09111234567
                </a>
              </li>
              <li>
                <a href="tel:09111234567" className="ltr-num">
                  09111234567
                </a>
              </li>
              <li>
                <a href="mailto:example@gmail.com" className="ltr-num">
                  example@gmail.com
                </a>
              </li>
            </ul>
          </div>
          <div className="footer-licenses">
            <h3>نماد ها و مجوز ها</h3>
            <div>
              <Image
                src="/design/license-enamad-rendered.png"
                alt="نمادها و مجوزهای درج‌شده در طرح"
                width={217}
                height={121}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
