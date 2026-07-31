'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { summarizeText, explainCodeSnippet, detectLanguage } from '@/lib/ai';

const DRAFT_KEY = 'ViciousSuite_Offline_draft';

export default function OfflineApp() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState<'summarize' | 'explain' | 'detect' | null>(null);

  // Load / persist draft locally, same as the original app.
  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => window.localStorage.setItem(DRAFT_KEY, text), 300);
    return () => clearTimeout(id);
  }, [text]);

  async function run(kind: 'summarize' | 'explain' | 'detect') {
    if (!text.trim() || busy) return;
    setBusy(kind);
    try {
      const output =
        kind === 'summarize'
          ? await summarizeText(text)
          : kind === 'explain'
          ? await explainCodeSnippet(text)
          : await detectLanguage(text);
      setResult(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult(`Error: ${message}`);
      toast({ title: 'Request failed', description: message });
    } finally {
      setBusy(null);
    }
  }

  function exportFile(ext: 'md' | 'txt') {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRefresh() {
    setText('');
    setResult('');
    setBusy(null);
    window.localStorage.removeItem(DRAFT_KEY);
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-headline text-xl font-semibold">Vicious Offline</h2>
          <p className="text-xs text-muted-foreground">
            Local-first text workspace. AI tools summarize, explain, or classify your text.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleRefresh} title="Refresh tab">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start writing or paste code..."
        className="min-h-[240px] font-code text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!text.trim() || busy !== null}
          onClick={() => run('summarize')}
        >
          {busy === 'summarize' ? 'Summarizing…' : 'Summarize'}
        </Button>
        <Button
          variant="secondary"
          disabled={!text.trim() || busy !== null}
          onClick={() => run('explain')}
        >
          {busy === 'explain' ? 'Explaining…' : 'Explain code'}
        </Button>
        <Button
          variant="secondary"
          disabled={!text.trim() || busy !== null}
          onClick={() => run('detect')}
        >
          {busy === 'detect' ? 'Detecting…' : 'Detect language'}
        </Button>
        <Button variant="outline" disabled={!text.trim()} onClick={() => exportFile('md')}>
          Export .md
        </Button>
        <Button variant="outline" disabled={!text.trim()} onClick={() => exportFile('txt')}>
          Export .txt
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-input bg-card p-3 text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
