import Image from 'next/image';
const STATS = [
  { asset: 'stat-shipping', size: 43, value: '۲۴-۴۸ ساعت', label: 'ارسال به سراسر کشور' },
  { asset: 'stat-satisfaction', size: 42, value: '‎+۹۷٪', label: 'رضایت مشتریان' },
  { asset: 'stat-customers', size: 38, value: '‎+۱۰٬۰۰۰', label: 'مشتری عمده و خرده' },
  { asset: 'stat-products', size: 44, value: '‎+۵٬۰۰۰', label: 'محصول متنوع' },
  { asset: 'stat-history', size: 44, value: '‎+۲۵ سال', label: 'سابقه تامین و تولید' },
];
export function TrustBar() {
  return (
    <section className="trust-section bg-ink-600 text-white">
      <ul className="container-page grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
        {STATS.map(({ asset, size, value, label }) => (
          <li
            key={label}
            className="flex items-center justify-center gap-3 text-center lg:text-start"
          >
            <span className="stat-art">
              <Image src={`/design/${asset}.svg`} alt="" width={size} height={size} />
            </span>
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
