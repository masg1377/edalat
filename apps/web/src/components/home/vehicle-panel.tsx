'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { VehicleSummary } from '@edalat/shared';
import { toPersianDigits } from '@edalat/shared';
import { ButtonLink } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CarIcon } from '@/components/ui/icons';
import { designAssets, vehicleAssets, vehicleBrandAssets } from '@/lib/design-assets';

interface VehiclePanelProps {
  vehicle: VehicleSummary | null;
  vehicles?: VehicleSummary[];
}

export function VehiclePanel({ vehicle, vehicles = [] }: VehiclePanelProps) {
  const choices = [vehicle, ...vehicles].filter(
    (item, index, items): item is VehicleSummary =>
      item !== null && items.findIndex((other) => other?.id === item.id) === index,
  );
  const [index, setIndex] = useState(0);
  const current = choices[index % Math.max(choices.length, 1)] ?? null;
  const photo =
    current?.slug === 'samand-ef7'
      ? designAssets.samand
      : current
        ? vehicleAssets[current.slug]
        : designAssets.samand;
  const move = (delta: number) =>
    setIndex((value) => (value + delta + choices.length) % Math.max(choices.length, 1));

  return (
    <section
      className="vehicle-section container-page"
      aria-label="اطلاعات خودرو"
      aria-roledescription="اسلایدر"
    >
      <div className="vehicle-card" data-vehicle-slug={current?.slug ?? ''}>
        <div className="vehicle-copy">
          <h2 className="vehicle-title">اطلاعات خودروی شما</h2>
          <p>
            خودروی خود را انتخاب کنید تا قطعات سازگار را پیدا کنید.
            <br />
            برای مشاهده قطعات مناسب، اطلاعات خودرو را تأیید کنید.
          </p>
          <dl className="vehicle-facts" aria-live="polite" aria-atomic="true">
            <Fact
              label="برند"
              value={current?.brand.name ?? 'انتخاب برند'}
              image={current ? vehicleBrandAssets[current.brand.slug] : null}
            />
            <Fact label="نام" value={current?.model ?? 'انتخاب خودرو'} />
            <Fact
              label="مدل"
              value={
                current?.generation ??
                (current?.yearFrom ? toPersianDigits(current.yearFrom) : 'انتخاب مدل')
              }
              calendar
            />
          </dl>
          <ButtonLink
            href={current ? `/vehicles/${current.slug}` : '/vehicles'}
            className="vehicle-cta"
          >
            {current ? 'مشاهده همه سازگاری ها' : 'انتخاب خودرو'}
          </ButtonLink>
        </div>
        <div
          className="vehicle-visual"
          onKeyDown={(event) => {
            if (choices.length < 2) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? 1 : -1);
            }
          }}
        >
          <button
            type="button"
            className="vehicle-arrow"
            aria-label="خودروی قبلی"
            disabled={choices.length < 2}
            onClick={() => move(-1)}
          >
            <ArrowRightIcon className="size-7" aria-hidden />
          </button>
          <div className="vehicle-photo">
            {photo ? (
              <Image
                src={photo}
                alt={current ? `${current.brand.name} ${current.model}` : 'سمند'}
                fill
                sizes="(max-width: 768px) 85vw, 570px"
                className="object-contain"
              />
            ) : (
              <CarIcon className="size-32 text-ink-300" />
            )}
          </div>
          <button
            type="button"
            className="vehicle-arrow"
            aria-label="خودروی بعدی"
            disabled={choices.length < 2}
            onClick={() => move(1)}
          >
            <ArrowLeftIcon className="size-7" aria-hidden />
          </button>
          <span className="sr-only" aria-live="polite">
            {choices.length
              ? `${toPersianDigits((index % choices.length) + 1)} از ${toPersianDigits(choices.length)}`
              : 'خودرویی برای نمایش نیست'}
          </span>
        </div>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  image,
  calendar,
}: {
  label: string;
  value: string;
  image?: string | null;
  calendar?: boolean;
}) {
  return (
    <div className="vehicle-fact">
      {image ? (
        <Image src={image} alt="" width={38} height={36} className="object-contain" />
      ) : calendar ? (
        <CalendarIcon className="vehicle-fact-icon" aria-hidden />
      ) : (
        <CarIcon className="vehicle-fact-icon" aria-hidden />
      )}
      <div>
        <dt>{label}:</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}
