import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';
import { HeadsetIcon } from '@/components/ui/icons';
import { Logo } from './logo';

const COLUMNS = [
  {
    title: 'دسترسی سریع',
    links: [
      { href: '/store', label: 'محصولات' },
      { href: '/brands', label: 'برند ها' },
      { href: '/manufacturing', label: 'خدمات اختصاصی' },
      { href: '/manufacturing', label: 'سفارشی سازی' },
      { href: '/contact', label: 'تماس با ما' },
    ],
  },
  {
    title: 'خدمات مشتریان',
    links: [
      { href: '/faq', label: 'پرسش های متداول' },
      { href: '/shipping', label: 'شرایط خرید و ارسال' },
      { href: '/returns', label: 'ضمانت و بازگشت کالا' },
      { href: '/privacy', label: 'حریم خصوصی' },
      { href: '/warranty', label: 'گارانتی محصولات' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-ink-600 pb-10 pt-20 text-white">
      <div className="container-page">
        {/* Consultation call-out, overlapping the dark footer as in the design */}
        <div className="-mt-40 mb-14 rounded-card bg-sand p-8 text-ink-800 shadow-card md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <HeadsetIcon className="size-16 shrink-0 text-ink-800 md:size-20" />
              <div>
                <h2 className="text-lg font-bold md:text-xl">نیاز به مشاوره یا استعلام قیمت دارید؟</h2>
                <p className="mt-2 text-sm text-ink-500">
                  کارشناسان ما آماده پاسخگویی به سوالات شما در سریع‌ترین زمان هستند.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact" variant="dark">
                در خواست مشاوره
              </ButtonLink>
              <ButtonLink href="tel:09111234567" variant="primary" className="ltr-num">
                09111234567
              </ButtonLink>
            </div>
          </div>

          <hr className="my-9 border-ink-200" />

          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size="md" />
              <p className="mt-5 text-sm leading-8 text-ink-500">
                تولیدکننده و تأمین‌کننده قطعات یدکی خودرو
                <br />
                تأمین مستقیم از کارخانه با تضمین کیفیت و قیمت رقابت
              </p>
            </div>

            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="mb-5 font-bold">{column.title}</h3>
                <ul className="space-y-3.5 text-sm text-ink-500">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link href={link.href} className="transition-colors hover:text-ink-800">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="mb-5 font-bold">اطلاعات تماس</h3>
              <ul className="space-y-3.5 text-sm text-ink-500">
                <li>مازندران ساری</li>
                <li><span className="ltr-num">09111234567</span></li>
                <li><span className="ltr-num">09111234567</span></li>
                <li><span className="ltr-num">example@gmail.com</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 text-sm text-white/70 md:flex-row">
          <p>© {new Date().getFullYear()} عدالت فیلتر — تمامی حقوق محفوظ است.</p>
          <p>ساخته شده برای پیدا کردن، خرید و تولید فیلتر خودرو</p>
        </div>
      </div>
    </footer>
  );
}
