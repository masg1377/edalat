import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { DashboardNavigation } from '@/components/layout/dashboard-navigation';
export const metadata = {
  title: 'پیش‌نمایش رنگ‌های حساب',
  robots: { index: false, follow: false },
};
export default function AccountPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <>
      <Header />
      <main className="dashboard-page container-page pb-16 pt-8">
        <h1 className="text-xl font-black">پنل کاربری</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside>
            <DashboardNavigation pathname="/dashboard" />
          </aside>
          <div className="rounded-card bg-surface p-8">
            <h2 className="text-xl font-bold">پیش‌نمایش منوی حساب کاربری</h2>
            <p className="mt-4">کنترل رنگ متن، زمینه و گزینهٔ انتخاب‌شده.</p>
          </div>
        </div>
      </main>
    </>
  );
}
