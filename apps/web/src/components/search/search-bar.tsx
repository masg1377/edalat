'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { SearchSuggestion } from '@edalat/shared';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CameraIcon, MicIcon } from '@/components/ui/icons';
import { VoiceSearchDialog } from './voice-search-dialog';

interface SearchBarProps {
  className?: string;
  defaultValue?: string;
  placeholder?: string;
}

/**
 * PRD §7 — the search bar is a core feature, not a text box: three inputs
 * (typing, voice, photo) all lead into the same discovery funnel.
 */
export function SearchBar({
  className,
  defaultValue = '',
  placeholder = 'جستجو از طریق نام محصول ، برند ، کد فنی ...',
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // PRD §64 — debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.search
        .suggestions(q)
        .then((items) => {
          if (!controller.signal.aborted) {
            setSuggestions(items);
            setOpen(items.length > 0);
          }
        })
        .catch(() => setSuggestions([]));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const submit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="flex h-16 w-full items-center gap-2 rounded-pill bg-sand ps-2 pe-5"
      >
        <button
          type="submit"
          className="h-[52px] shrink-0 rounded-pill bg-ink-600 px-8 text-lg font-bold text-white transition-colors hover:bg-ink-700"
        >
          جستجو
        </button>

        <button
          type="button"
          onClick={() => setVoiceOpen(true)}
          aria-label="جستجوی صوتی"
          title="جستجوی صوتی"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
        >
          <MicIcon className="size-6" />
        </button>

        <a
          href="/product-request"
          aria-label="ارسال تصویر محصول"
          title="عکس قطعه را بفرستید تا پیدایش کنیم"
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-100"
        >
          <CameraIcon className="size-6" />
        </a>

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setOpen(suggestions.length > 0)}
          placeholder={placeholder}
          aria-label="جستجوی محصول"
          className="h-full min-w-0 flex-1 bg-transparent text-right text-sm text-ink-800 outline-none placeholder:text-ink-400 md:text-base"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-ink-100 bg-white py-2 shadow-float"
        >
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.kind}-${suggestion.href}`}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(suggestion.href);
                }}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-right transition-colors hover:bg-ink-50"
              >
                <span className="text-sm text-ink-800">{suggestion.label}</span>
                <span className="shrink-0 rounded-full bg-ink-50 px-2.5 py-1 text-[11px] text-ink-500">
                  {SUGGESTION_LABEL[suggestion.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <VoiceSearchDialog
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onTranscript={(text) => {
          setValue(text);
          submit(text);
        }}
      />
    </div>
  );
}

const SUGGESTION_LABEL: Record<string, string> = {
  PRODUCT: 'محصول',
  VEHICLE: 'خودرو',
  BRAND: 'برند',
  CATEGORY: 'دسته‌بندی',
  TECHNICAL_CODE: 'کد فنی',
};
