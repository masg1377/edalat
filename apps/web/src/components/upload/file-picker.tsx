'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

import { FileIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * PRD §66 — only these MIME types are ever accepted; an executable can never
 * reach this picker. `DOCUMENT_TYPES` extends the image set with PDF for
 * fields that take a design/reference document rather than a photo.
 */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf'];

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export interface PickedFile {
  name: string;
  dataUrl: string;
  isImage: boolean;
}

/**
 * Shared select/preview UI for every file field in the app (product photo
 * request, manufacturing request: logo, packaging design, product/sample
 * image, attachments).
 *
 * `claude/وضعیت-پیاده‌سازی.md` documents the reason files end up as data
 * URLs here instead of object-storage URLs: there is no `/uploads` service
 * yet, so the client-side data URL travels straight in the JSON body the
 * same way `product-request/page.tsx` already did before this component was
 * extracted from it. Swapping in real presigned uploads later only changes
 * `toDataUrl` below — every screen that uses `FilePicker` keeps working.
 */
export function FilePicker({
  label,
  hint,
  accept = IMAGE_TYPES,
  maxBytes = DEFAULT_MAX_BYTES,
  multiple = false,
  maxFiles = multiple ? 5 : 1,
  value,
  onChange,
  className,
}: {
  label: string;
  hint?: string;
  /** Accepted MIME types — defaults to images only. */
  accept?: string[];
  maxBytes?: number;
  multiple?: boolean;
  maxFiles?: number;
  value: PickedFile[];
  onChange: (files: PickedFile[]) => void;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const accepted: PickedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!accept.includes(file.type)) {
        setError('نوع فایل انتخاب‌شده مجاز نیست.');
        continue;
      }
      if (file.size > maxBytes) {
        setError(`حجم هر فایل باید کمتر از ${maxMb} مگابایت باشد.`);
        continue;
      }
      try {
        const dataUrl = await toDataUrl(file);
        accepted.push({ name: file.name, dataUrl, isImage: file.type.startsWith('image/') });
      } catch {
        setError('خواندن فایل ناموفق بود.');
      }
    }

    if (accepted.length === 0) return;
    const merged = multiple ? [...value, ...accepted] : accepted.slice(0, 1);
    onChange(merged.slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const canAddMore = value.length < maxFiles;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="block text-xs text-ink-600">{label}</span>
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple={multiple}
        onChange={(event) => void addFiles(event.target.files)}
        className="sr-only"
        aria-label={label}
      />

      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-ink-200 bg-white py-6 text-xs font-bold text-ink-600 transition-colors hover:border-brand-500"
        >
          <FileIcon className="size-6 text-ink-400" aria-hidden />
          {multiple ? 'افزودن فایل' : 'انتخاب فایل'}
        </button>
      )}

      {value.length > 0 && (
        <ul className={cn('mt-3', multiple ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-1')}>
          {value.map((file, index) => (
            <li key={`${file.name}-${index}`} className="relative">
              {file.isImage ? (
                <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                  <Image
                    src={file.dataUrl}
                    alt={file.name}
                    fill
                    sizes="120px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-4 text-xs text-ink-700">
                  <FileIcon className="size-5 shrink-0 text-ink-400" aria-hidden />
                  <span className="truncate">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`حذف ${file.name}`}
                className="absolute -top-2 -end-2 grid size-6 place-items-center rounded-full bg-ink-600 text-[11px] text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    reader.readAsDataURL(file);
  });
}
