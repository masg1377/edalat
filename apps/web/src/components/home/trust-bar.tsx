import { BoxIcon, ClockIcon, PercentIcon, TruckIcon, UsersIcon } from '@/components/ui/icons';

const STATS = [
  { icon: TruckIcon, value: '۲۴-۴۸ ساعت', label: 'ارسال به سراسر کشور' },
  { icon: PercentIcon, value: '‎+۹۷٪', label: 'رضایت مشتریان' },
  { icon: UsersIcon, value: '‎+۱۰٬۰۰۰', label: 'مشتری عمده و خرده' },
  { icon: BoxIcon, value: '‎+۵٬۰۰۰', label: 'محصول متنوع' },
  { icon: ClockIcon, value: '‎+۲۵ سال', label: 'سابقه تامین و تولید' },
];

export function TrustBar() {
  return (
    <section className="mt-24 bg-ink-600 py-10 text-white">
      <ul className="container-page grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
        {STATS.map(({ icon: Icon, value, label }) => (
          <li key={label} className="flex items-center justify-center gap-3 text-center lg:text-start">
            <Icon className="size-8 shrink-0" />
            <span>
              <b className="block text-sm font-bold">{value}</b>
              <span className="mt-1 block text-xs text-white/70">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
