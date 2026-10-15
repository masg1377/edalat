import type { Metadata } from 'next';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SearchBar } from '@/components/search/search-bar';
import { ContactMailtoForm } from '@/components/contact/contact-mailto-form';
import { ButtonLink } from '@/components/ui/button';
const PHONE = '09111234567';
const MAP_URL =
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('عدالت فیلتر، ساری');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'راه‌های تماس با تیم فروش و پشتیبانی عدالت فیلتر.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { url: `${SITE_URL}/contact` },
};
const CHANNELS = [
  {
    asset: 'support.svg',
    width: 36,
    height: 47,
    title: 'پشتیبانی و سفارشات',
    value: PHONE,
    body: 'شنبه تا چهارشنبه، ۸ تا ۱۸',
    href: `tel:${PHONE}`,
  },
  {
    asset: 'whatsapp.svg',
    width: 59,
    height: 59,
    title: 'واتساپ',
    value: PHONE,
    body: 'پشتیبانی در واتساپ',
    href: 'https://wa.me/989111234567',
  },
  {
    asset: 'instagram.png',
    width: 55,
    height: 58,
    title: 'اینستاگرام',
    value: '@instagram',
    body: 'ما را دنبال کنید',
    href: 'https://www.instagram.com/',
  },
];
export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="public-page contact-page container-page">
        <SearchBar className="public-search" />
        <section className="contact-hero">
          <div className="contact-copy">
            <h1>تماس با ما</h1>
            <p>
              نیاز به راهنمایی دارید؟
              <br />
              تیم پشتیبانی عدالت فیلتر آماده پاسخگویی به شماست
            </p>
            <div className="contact-address">
              <h2>اطلاعات تماس و آدرس</h2>
              <h3>آدرس فروشگاه</h3>
              <p>
                مازندران، ساری
                <br />
                عدالت فیلتر
              </p>
              <h3>شماره تماس</h3>
              <a href={`tel:${PHONE}`} className="ltr-num">
                {PHONE}
              </a>
              <h3>ساعات کاری</h3>
              <p>
                شنبه تا چهارشنبه 8:00 تا 18:00
                <br />
                پنج‌شنبه 8:00 تا 14:00
                <br />
                جمعه و تعطیلات: تعطیل
              </p>
            </div>
          </div>
          <Image
            src="/design/contact-parts.png"
            alt="مجموعه قطعات یدکی خودرو"
            width={861}
            height={861}
            className="contact-parts"
            priority
          />
        </section>
        <section aria-label="راه‌های ارتباط" className="contact-channels">
          {CHANNELS.map((channel) => (
            <a key={channel.asset} href={channel.href} className="contact-channel">
              <Image
                src={`/design/contact-${channel.asset}`}
                alt=""
                width={channel.width}
                height={channel.height}
              />
              <div>
                <h2>{channel.title}</h2>
                <b className="ltr-num">{channel.value}</b>
                <p>{channel.body}</p>
              </div>
            </a>
          ))}
        </section>
        <section className="contact-map" aria-label="موقعیت فروشگاه">
          <Image
            src="/design/contact-map.png"
            alt="نقشه موقعیت فروشگاه در طرح"
            fill
            sizes="1300px"
            className="object-cover"
          />
          <div>
            <h2>موقعیت ما روی نقشه</h2>
            <p>برای مشاهده موقعیت فروشگاه روی نقشه کلیک کنید.</p>
            <ButtonLink href={MAP_URL} target="_blank" rel="noopener noreferrer">
              مسیر یابی
            </ButtonLink>
          </div>
        </section>
        <section className="contact-message">
          <ContactMailtoForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
