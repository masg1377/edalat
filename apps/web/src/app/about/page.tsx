import type { Metadata } from 'next';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchBar } from '@/components/search/search-bar';
import { ButtonLink } from '@/components/ui/button';
import { HeadsetIcon, ShieldCheckIcon, UsersIcon, BoxIcon } from '@/components/ui/icons';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const metadata: Metadata = {
  title: 'درباره ما',
  description: 'درباره عدالت فیلتر، تأمین‌کننده فیلتر و قطعات یدکی خودرو.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { url: `${SITE_URL}/about` },
};
const TIMELINE = [
  {
    year: '1400',
    title: 'شروع فعالیت',
    body: 'فعالیت خود را با تمرکز بر فیلتر های خودروهای داخلی آغاز کردیم',
  },
  {
    year: '1402',
    title: 'گسترش محصولات',
    body: 'افزودن فیلتر های کابین، فیلتر سوخت و برند های جدید',
  },
  {
    year: '1403',
    title: 'فروشگاه آنلاین',
    body: 'راه اندازی فروشگاه اینترنتی و ارسال به سراسر کشور',
  },
  { year: '1405', title: 'توسعه خدمات', body: 'ارائه اطلاعات تخصصی خودرو و راهنمای انتخاب قطعه' },
];
const VALUES = [
  { icon: UsersIcon, title: 'مشتری مداری', body: 'رضایت مشتری اولویت اصلی ما در همه مراحل است' },
  { icon: ShieldCheckIcon, title: 'اعتماد', body: 'صداقت در ارائه اطلاعات و شفافیت در خدمات' },
  { icon: BoxIcon, title: 'کیفیت', body: 'بهترین قیمت ها با حفظ کیفیت و اصالت کالا' },
  {
    icon: HeadsetIcon,
    title: 'پشتیبانی',
    body: 'پاسخگویی سریع و راهنمایی تخصصی قبل و بعد از خرید',
  },
];
export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="public-page about-page container-page">
        <SearchBar className="public-search" />
        <section className="about-hero">
          <Image
            src="/design/about-hero-figma.png"
            alt="خط تولید و قطعات صنعتی خودرو"
            fill
            priority
            sizes="(max-width:768px) 100vw,1304px"
            className="object-cover"
          />
          <div className="about-hero-copy">
            <h1>درباره ما</h1>
            <p>
              عدالت فیلتر از سال 1400 فعالیت خود را با هدف ارائه قطعات با کیفیت برای خودرو با تمرکز
              بر فیلتر ها آغاز کرد.
              <br />
              ما باور داریم که کیفیت قطعات نقش مهمی در سلامت و طول عمر خودرو دارد.
            </p>
            <div className="about-promises">
              <div>
                <b>ارسال سریع</b>
                <span>ارسال به سراسر کشور در کوتاه ترین زمان</span>
              </div>
              <div>
                <b>تضمین اصالت کالا</b>
                <span>کالاهای با ضمانت اصالت کالا</span>
              </div>
            </div>
          </div>
        </section>
        <section className="about-timeline">
          <h2>مسیر ما</h2>
          <ol className="public-facts">
            {TIMELINE.map((item) => (
              <li key={item.year}>
                <h3>
                  <span className="ltr-num">{item.year}</span>
                  <br />
                  {item.title}
                </h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="about-mission">
          <Image
            src="/design/about-mission.png"
            alt="قطعات یدکی و چرخ‌دنده‌های خودرو"
            width={620}
            height={499}
          />
          <div>
            <span>ماموریت ما</span>
            <h2>ارائه بهترین قطعات با قیمت مناسب</h2>
            <p>
              ما در عدالت فیلتر تلاش می کنیم تا با انتخاب دقیق برند های معتبر جهانی، ارائه اطلاعات
              تخصصی و قیمت منصفانه، تجربه خریدی آسان، مطمئن و رضایت بخش را برای شما فراهم کنیم.
            </p>
            <ButtonLink href="/products" size="lg">
              مشاهده محصولات
            </ButtonLink>
          </div>
        </section>
        <section className="about-values">
          <h2>ارزش های ما</h2>
          <ul className="public-facts">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <h3>
                  <Icon className="size-5 text-brand-500" />
                  {title}
                </h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
