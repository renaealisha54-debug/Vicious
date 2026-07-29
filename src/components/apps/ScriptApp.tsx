'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, Sparkles, Wand2, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { aiCodeGenerator, aiErrorInterpreter, aiTitler } from '@/app/actions';

const DEFAULT_CODE = `// Welcome to Vicious Script!
// Write your JavaScript code here.

const greeting = "Hello from Vicious Script!";
console.log(greeting);

const users = [
  { id: 1, name: "Alice", score: 85 },
  { id: 2, name: "Bob", score: 92 },
  { id: 3, name: "Charlie", score: 78 }
];

const highScorers = users
  .filter(u => u.score > 80)
  .map(u => u.name);

console.log("Top Performers:", highScorers);
`;

const STORAGE_KEY = 'ViciousSuite_Script_draft';
const TITLE_STORAGE_KEY = 'ViciousSuite_Script_title';
const DEFAULT_TITLE = 'Untitled Vicious Script';
const EXECUTION_TIMEOUT_MS = 10000;

interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

function buildWorkerSource() {
  return `
    self.onmessage = (e) => {
      const send = (level, args) => {
        try {
          const text = args.map(a => {
            if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
            return String(a);
          }).join(' ');
          self.postMessage({ type: 'log', level, text });
        } catch (err) {}
      };
      console.log = (...a) => send('log', a);
      console.info = (...a) => send('info', a);
      console.warn = (...a) => send('warn', a);
      console.error = (...a) => send('error', a);
      try {
        new Function(e.data)();
        self.postMessage({ type: 'done' });
      } catch (err) {
        self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
      }
    };
  `;
}

export default function ScriptApp() {
  const { toast } = useToast();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<'error' | 'generate' | 'title' | null>(null);
  const [genPrompt, setGenPrompt] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const savedCode = window.localStorage.getItem(STORAGE_KEY);
    const savedTitle = window.localStorage.getItem(TITLE_STORAGE_KEY);
    if (savedCode) setCode(savedCode);
    if (savedTitle) setTitle(savedTitle);
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => window.localStorage.setItem(STORAGE_KEY, code), 300);
    return () => clearTimeout(id);
  }, [code]);

  useEffect(() => {
    window.localStorage.setItem(TITLE_STORAGE_KEY, title);
  }, [title]);

  function runScript() {
    if (running) return;
    setLines([]);
    setLastError(null);
    setRunning(true);

    const blob = new Blob([buildWorkerSource()], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const timeout = setTimeout(() => {
      worker.terminate();
      setRunning(false);
      setLines((prev) => [...prev, { level: 'error', text: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s (loop watchdog).` }]);
    }, EXECUTION_TIMEOUT_MS);

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'log') {
        setLines((prev) => [...prev, { level: msg.level, text: msg.text }]);
      } else if (msg.type === 'done') {
        clearTimeout(timeout);
        setRunning(false);
        worker.terminate();
      } else if (msg.type === 'error') {
        clearTimeout(timeout);
        setRunning(false);
        setLastError(msg.message);
        setLines((prev) => [...prev, { level: 'error', text: msg.message }]);
        worker.terminate();
      }
    };
    worker.postMessage(code);
  }

  function handleRefresh() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setCode(DEFAULT_CODE);
    setTitle(DEFAULT_TITLE);
    setLines([]);
    setLastError(null);
    setGenPrompt('');
    setRunning(false);
    setBusy(null);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TITLE_STORAGE_KEY);
  }

  async function handleInterpretError() {
    if (!lastError || busy) return;
    setBusy('error');
    try {
      const explanation = await aiErrorInterpreter(code, lastError);
      setLines((prev) => [...prev, { level: 'info', text: `AI: ${explanation}` }]);
    } catch (err) {
      toast({ title: 'AI error interpreter failed', description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate() {
    if (!genPrompt.trim() || busy) return;
    setBusy('generate');
    try {
      const generated = await aiCodeGenerator(genPrompt);
      setCode(generated);
      toast({ title: 'Code generated', description: 'Editor updated with the generated snippet.' });
    } catch (err) {
      toast({ title: 'Code generation failed', description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  }

  async function handleTitle() {
    if (!code.trim() || busy) return;
    setBusy('title');
    try {
      const suggested = await aiTitler(code);
      setTitle(suggested);
      toast({ title: 'Title suggested', description: suggested });
    } catch (err) {
      toast({ title: 'Titler failed', description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="font-headline shrink-0 text-base font-bold tracking-tight">Vicious Script</h2>
          <span className="truncate text-xs text-muted-foreground">— {title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleRefresh} title="Refresh tab">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleTitle} disabled={busy !== null}>
            <Tag className="mr-2 h-4 w-4" />
            {busy === 'title' ? 'Titling…' : 'AI Title'}
          </Button>
          <Button size="sm" onClick={runScript} disabled={running}>
            <Play className="mr-2 h-4 w-4" />
            {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-full flex-1 resize-none rounded-none border-none font-code text-sm focus-visible:ring-0"
            spellCheck={false}
          />
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border p-2">
            <input
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="Describe JS to generate…"
              className="h-8 flex-1 min-w-[160px] rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={!genPrompt.trim() || busy !== null}>
              <Wand2 className="mr-2 h-4 w-4" />
              {busy === 'generate' ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">Console</span>
            {lastError && (
              <Button size="sm" variant="ghost" onClick={handleInterpretError} disabled={busy !== null}>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {busy === 'error' ? 'Interpreting…' : 'AI: Explain error'}
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-code text-xs">
            {lines.length === 0 && (
              <p className="text-muted-foreground">Console output will appear here.</p>
            )}
            {lines.map((line, i) => (
              <div
                key={i}
                className={
                  line.level === 'error'
                    ? 'text-destructive'
                    : line.level === 'warn'
                    ? 'text-yellow-500'
                    : line.level === 'info'
                    ? 'text-accent'
                    : 'text-foreground'
                }
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
