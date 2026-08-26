'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Tab strip from the Figma product page: description / specs / reviews / shipping. */
export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="rounded-card bg-surface-soft p-6 md:p-8">
      <div role="tablist" aria-label="اطلاعات محصول" className="flex flex-wrap gap-2 border-b border-ink-100 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              'rounded-pill px-5 py-2.5 text-sm transition-colors',
              active === tab.id
                ? 'bg-brand-500 font-bold text-ink-900'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="pt-6"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
