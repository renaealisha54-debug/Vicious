'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RefreshCw, Sparkles, Wand2, Tag, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { aiCodeGenerator, aiErrorInterpreter, aiTitler } from '@/lib/ai';
import { saveOutput, listOutputs, deleteOutput, type SavedOutput } from '@/lib/outputVault';

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
const IFRAME_MESSAGE_TAG = 'vicious-script-sandbox';
const TAB_KEY = 'script';

interface ConsoleLine {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

function buildSandboxHtml(userCode: string) {
  const escaped = JSON.stringify(userCode);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body><script>
(function () {
  const TAG = ${JSON.stringify(IFRAME_MESSAGE_TAG)};
  function send(kind, payload) {
    try {
      parent.postMessage({ tag: TAG, kind, payload }, '*');
    } catch (e) {}
  }
  function fmt(args) {
    return args.map(function (a) {
      if (typeof a === 'object' && a !== null) {
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
  }
  console.log = function () { send('log', fmt(Array.prototype.slice.call(arguments))); };
  console.info = function () { send('info', fmt(Array.prototype.slice.call(arguments))); };
  console.warn = function () { send('warn', fmt(Array.prototype.slice.call(arguments))); };
  console.error = function () { send('error', fmt(Array.prototype.slice.call(arguments))); };
  window.onerror = function (message) {
    send('runtime-error', String(message));
    return true;
  };
  try {
    new Function(${escaped})();
    send('done', null);
  } catch (err) {
    send('runtime-error', err && err.message ? err.message : String(err));
  }
})();
<\/script></body></html>`;
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
  const [saved, setSaved] = useState<SavedOutput[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedCode = window.localStorage.getItem(STORAGE_KEY);
    const savedTitle = window.localStorage.getItem(TITLE_STORAGE_KEY);
    if (savedCode) setCode(savedCode);
    if (savedTitle) setTitle(savedTitle);
    setSaved(listOutputs(TAB_KEY));
    return () => cleanupIframe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => window.localStorage.setItem(STORAGE_KEY, code), 300);
    return () => clearTimeout(id);
  }, [code]);

  useEffect(() => {
    window.localStorage.setItem(TITLE_STORAGE_KEY, title);
  }, [title]);

  function cleanupIframe() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (iframeRef.current) {
      iframeRef.current.remove();
      iframeRef.current = null;
    }
  }

  function finishRun() {
    cleanupIframe();
    setRunning(false);
  }

  function runScript() {
    if (running) return;
    setLines([]);
    setLastError(null);
    setRunning(true);
    cleanupIframe();

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.srcdoc = buildSandboxHtml(code);
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.tag !== IFRAME_MESSAGE_TAG) return;

      if (data.kind === 'done') {
        window.removeEventListener('message', handleMessage);
        finishRun();
      } else if (data.kind === 'runtime-error') {
        window.removeEventListener('message', handleMessage);
        setLastError(data.payload);
        setLines((prev) => [...prev, { level: 'error', text: data.payload }]);
        finishRun();
      } else {
        setLines((prev) => [...prev, { level: data.kind, text: data.payload }]);
      }
    };
    window.addEventListener('message', handleMessage);

    timeoutRef.current = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setLines((prev) => [
        ...prev,
        { level: 'error', text: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s (loop watchdog).` },
      ]);
      finishRun();
    }, EXECUTION_TIMEOUT_MS);
  }

  function handleRefresh() {
    cleanupIframe();
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

  function handleSaveOutput() {
    if (!code.trim()) return;
    const consoleText = lines.map((l) => `[${l.level}] ${l.text}`).join('\n');
    const combined = `// ${title}\n\n${code}\n\n// --- Console output ---\n${consoleText || '(no output)'}`;
    const entry = saveOutput(TAB_KEY, title, combined);
    setSaved((prev) => [entry, ...prev]);
    toast({ title: 'Saved', description: 'Script + output saved.' });
  }

  function handleDeleteSaved(id: string) {
    deleteOutput(TAB_KEY, id);
    setSaved((prev) => prev.filter((o) => o.id !== id));
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
          <Button size="sm" variant="outline" onClick={handleSaveOutput}>
            <Save className="mr-2 h-4 w-4" />
            Save output
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
          {saved.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-2">
              {saved.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  <button
                    className="font-medium hover:underline"
                    onClick={() => {
                      const codePart = entry.content.split('\n\n// --- Console output ---')[0];
                      setCode(codePart.replace(/^\/\/ .*\n\n/, ''));
                    }}
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
          )}
        </div>
      </div>
    </div>
  );
}
