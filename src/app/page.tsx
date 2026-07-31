'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

import OfflineApp from '@/components/apps/OfflineApp';
import ArchiApp from '@/components/apps/ArchiApp';
import SparkApp from '@/components/apps/SparkApp';
import ScriptApp from '@/components/apps/ScriptApp';

const TABS = [
  { id: 'offline', label: 'Offline', dot: 'bg-[hsl(var(--tab-offline))]', Component: OfflineApp },
  { id: 'archi', label: 'Archi', dot: 'bg-[hsl(var(--tab-archi))]', Component: ArchiApp },
  { id: 'spark', label: 'Spark', dot: 'bg-[hsl(var(--tab-spark))]', Component: SparkApp },
  { id: 'script', label: 'Script', dot: 'bg-[hsl(var(--tab-script))]', Component: ScriptApp },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Home() {
  const [active, setActive] = useState<TabId>('offline');

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <h1 className="font-headline text-lg font-bold tracking-tight">Vicious</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            The Vicious Series Logic Suite
          </span>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card/40 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', tab.dot)} />
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-hidden">
        {TABS.map(({ id, Component }) => (
          <div key={id} className={cn('h-full', active === id ? 'block' : 'hidden')}>
            <Component />
          </div>
        ))}
      </main>
    </div>
  );
}
