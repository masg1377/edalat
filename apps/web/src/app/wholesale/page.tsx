import type { Metadata } from 'next';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchBar } from '@/components/search/search-bar';
import { ContactMailtoForm } from '@/components/contact/contact-mailto-form';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const metadata: Metadata = {
  title: 'فروش عمده',
  description: 'درخواست همکاری عمده برای فروشگاه‌ها، تعمیرگاه‌ها و پخش‌کنندگان قطعات خودرو.',
  alternates: { canonical: `${SITE_URL}/wholesale` },
  openGraph: { url: `${SITE_URL}/wholesale` },
};
const BENEFITS = [
  { asset: 'partnership', width: 78, height: 56, title: 'همکاری بلند مدت', body: 'و قابل اعتماد' },
  { asset: 'price', width: 54, height: 56, title: 'بهترین قیمت در', body: 'خرید عمده' },
  { asset: 'variety', width: 62, height: 64, title: 'تنوع کامل محصولات', body: 'برای انواع خودرو' },
  { asset: 'quality', width: 49, height: 62, title: 'تضمین کیفیت', body: 'محصولات' },
  { asset: 'shipping', width: 61, height: 47, title: 'ارسال سریع', body: 'به سراسر کشور' },
];
const AUDIENCES = [
  {
    asset: 'volume',
    title: 'خرید در تیراژ بالا',
    body: 'مناسب برای سازمان ها، شرکت ها و پروژه های بزرگ',
  },
  {
    asset: 'distributors',
    title: 'پخش کننده ها',
    body: 'همکاری ویژه برای شرکت ها و پخش های قطعات خودرو',
  },
  {
    asset: 'workshops',
    title: 'تعمیرگاه ها',
    body: 'دسترسی به فیلتر های با کیفیت برای خدمات بهتر به مشتریان',
  },
  { asset: 'stores', title: 'فروشگاه ها', body: 'تأمین انواع فیلتر با قیمت عمده برای فروشگاه شما' },
];
const STEPS = [
  {
    asset: 'request',
    width: 46,
    height: 46,
    title: 'ثبت درخواست',
    body: 'فرم درخواست خود را تکمیل کنید یا با ما تماس بگیرید',
  },
  {
    asset: 'consultation',
    width: 32,
    height: 42,
    title: 'مشاوره و استعلام',
    body: 'کارشناسان ما نیاز شما را بررسی و بهترین پیشنهاد را ارائه می دهند',
  },
  {
    asset: 'pricing',
    width: 36,
    height: 36,
    title: 'اعلام قیمت و شرایط',
    body: 'قیمت نهایی و شرایط همکاری به شما اعلام می گردد',
  },
  {
    asset: 'request',
    width: 46,
    height: 46,
    title: 'ثبت سفارش و ارسال',
    body: 'سفارش شما ثبت و در سریع ترین زمان ارسال می شود',
  },
];
const REASONS = [
  'نمایندگی رسمی و معتبر برند های معتبر جهانی',
  'تنوع بسیار در تأمین قطعات با کیفیت',
  'انبار مرکزی و موجودی کامل',
  'ارسال سریع به سراسر کشور',
  'پشتیبانی اختصاصی',
];
export default function WholesalePage() {
  return (
    <>
      <Header />
      <main className="public-page wholesale-page container-page">
        <SearchBar className="public-search" />
        <section aria-label="مزایای همکاری عمده" className="wholesale-benefits">
          {BENEFITS.map((item) => (
            <div key={item.asset}>
              <div>
                <Image
                  src={`/design/wholesale-benefit-${item.asset}.png`}
                  alt=""
                  width={item.width}
                  height={item.height}
                />
              </div>
              <h2>
                {item.title}
                <br />
                {item.body}
              </h2>
            </div>
          ))}
        </section>
        <section aria-label="مناسب برای چه کسانی" className="wholesale-audiences">
          {AUDIENCES.map((item) => (
            <article key={item.asset}>
              <Image
                src={`/design/wholesale-${item.asset}.png`}
                alt={item.title}
                width={291}
                height={173}
              />
              <span className="audience-marker" aria-hidden>
                ✓
              </span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
        <section aria-label="مراحل همکاری" className="wholesale-processes">
          {STEPS.map((item, index) => (
            <div key={index}>
              <span className="wholesale-step-art">
                <Image
                  src={`/design/wholesale-process-${item.asset}.svg`}
                  alt=""
                  width={item.width}
                  height={item.height}
                />
              </span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </div>
          ))}
        </section>
        <section className="wholesale-lead" aria-label="درخواست همکاری">
          <ContactMailtoForm variant="wholesale" />
          <div className="wholesale-why">
            <Image
              src="/design/wholesale-warehouse-background.png"
              alt="انبار تأمین قطعات"
              fill
              sizes="564px"
              className="object-cover"
            />
            <div className="wholesale-reasons">
              <h2>چرا عدالت فیلتر را انتخاب کنید؟</h2>
              <ul>
                {REASONS.map((reason) => (
                  <li key={reason}>
                    <span aria-hidden>✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <Image
              src="/design/wholesale-warehouse.png"
              alt="آماده‌سازی و ارسال سفارش‌های عمده"
              width={399}
              height={260}
              className="wholesale-forklift"
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
