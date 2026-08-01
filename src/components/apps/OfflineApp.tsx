'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { summarizeText, explainCodeSnippet, detectLanguage } from '@/lib/ai';
import { saveOutput, listOutputs, deleteOutput, type SavedOutput } from '@/lib/outputVault';

const DRAFT_KEY = 'ViciousSuite_Offline_draft';
const TAB_KEY = 'offline';

export default function OfflineApp() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState<'summarize' | 'explain' | 'detect' | null>(null);
  const [saved, setSaved] = useState<SavedOutput[]>([]);

  // Load / persist draft locally, same as the original app.
  useEffect(() => {
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (savedDraft) setText(savedDraft);
    setSaved(listOutputs(TAB_KEY));
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

  function handleSaveOutput() {
    if (!result.trim()) return;
    const entry = saveOutput(TAB_KEY, result.slice(0, 40) || 'Untitled', result);
    setSaved((prev) => [entry, ...prev]);
    toast({ title: 'Saved', description: 'Output saved.' });
  }

  function handleDeleteSaved(id: string) {
    deleteOutput(TAB_KEY, id);
    setSaved((prev) => prev.filter((o) => o.id !== id));
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
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-input bg-card p-3 text-sm whitespace-pre-wrap">
            {result}
          </div>
          <Button size="sm" variant="outline" className="self-start" onClick={handleSaveOutput}>
            <Save className="mr-2 h-4 w-4" />
            Save output
          </Button>
        </div>
      )}

      {saved.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <h3 className="text-xs font-medium text-muted-foreground">Saved outputs</h3>
          <div className="flex flex-wrap gap-2">
            {saved.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
              >
                <button
                  className="font-medium hover:underline"
                  onClick={() => setResult(entry.content)}
                >
                  {entry.label}
                </button>
                <button
                  onClick={() => handleDeleteSaved(entry.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
