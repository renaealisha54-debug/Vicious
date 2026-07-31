'use client';

import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const PLACEHOLDER = `// FILE: src/components/Button.tsx

import React from 'react';
export const Button = () => <button>Click me</button>;

// FILE: src/app/page.tsx

import { Button } from '../components/Button';
export default function Home() { return <Button />; }`;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onDissect: () => void;
  isDissecting: boolean;
}

export function CodeEditor({
  value,
  onChange,
  onDissect,
  isDissecting,
}: CodeEditorProps) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Monolith Input
        </h2>
        <Button
          size="sm"
          variant="accent"
          onClick={onDissect}
          disabled={isDissecting || value.trim().length === 0}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {isDissecting ? 'Dissecting…' : 'Dissect'}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        className={cn(
          'custom-scrollbar h-full flex-1 resize-none font-code text-sm leading-relaxed',
          'bg-card/50'
        )}
      />
    </div>
  );
}
