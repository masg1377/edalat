'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { MicIcon } from '@/components/ui/icons';

interface VoiceSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

type State = 'idle' | 'listening' | 'done' | 'denied' | 'unsupported';

/**
 * PRD §10 — voice search.
 *
 * Uses the browser's Web Speech API, which covers Chrome/Edge on desktop and
 * Android. Safari and Firefox have no support, so the dialog degrades to a
 * clear message rather than a dead button. The transcript is always shown for
 * confirmation before the search runs, as the PRD asks.
 */
export function VoiceSearchDialog({ open, onClose, onTranscript }: VoiceSearchDialogProps) {
  const [state, setState] = useState<State>('idle');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState('unsupported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setState('listening');
    recognition.onerror = (event: any) => {
      setState(event.error === 'not-allowed' ? 'denied' : 'idle');
    };
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join(' ');
      setTranscript(text);
      if (event.results[event.results.length - 1].isFinal) setState('done');
    };
    recognition.onend = () => setState((current) => (current === 'listening' ? 'done' : current));

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTranscript('');
      setState('idle');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جستجوی صوتی"
      className="fixed inset-0 z-[100] grid place-items-center bg-ink-900/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-float"
      >
        <div
          className={
            'mx-auto grid size-20 place-items-center rounded-full ' +
            (state === 'listening' ? 'animate-pulse bg-brand-500' : 'bg-sand')
          }
        >
          <MicIcon className="size-9 text-ink-800" />
        </div>

        <p className="mt-6 text-lg font-bold text-ink-800">
          {state === 'listening' && 'در حال شنیدن…'}
          {state === 'done' && 'این را شنیدم:'}
          {state === 'idle' && 'آماده ضبط'}
          {state === 'denied' && 'دسترسی به میکروفون داده نشد'}
          {state === 'unsupported' && 'مرورگر شما جستجوی صوتی را پشتیبانی نمی‌کند'}
        </p>

        <p className="mt-3 min-h-12 text-ink-500">
          {transcript ||
            (state === 'listening'
              ? 'مثلاً بگویید: فیلتر روغن سمند EF7'
              : state === 'denied'
                ? 'برای استفاده از این قابلیت، اجازه دسترسی به میکروفون را در تنظیمات مرورگر فعال کنید.'
                : state === 'unsupported'
                  ? 'می‌توانید عبارت موردنظر را تایپ کنید یا از قطعه عکس بفرستید.'
                  : '')}
        </p>

        <div className="mt-7 flex justify-center gap-3">
          <Button variant="muted" onClick={onClose}>
            انصراف
          </Button>
          <Button
            disabled={!transcript}
            onClick={() => {
              recognitionRef.current?.stop();
              onTranscript(transcript);
              onClose();
            }}
          >
            جستجو کن
          </Button>
        </div>
      </div>
    </div>
  );
}
