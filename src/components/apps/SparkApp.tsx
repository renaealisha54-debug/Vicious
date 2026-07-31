'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateComponentCode } from '@/lib/ai';

const VAULT_PREFIX = 'ViciousSuite_Spark_project_';
const VAULT_INDEX_KEY = 'ViciousSuite_Spark_index';

const DEFAULT_HTML = `<div class="spark-card">
  <h2>Hello, Spark</h2>
  <p>Edit the HTML and CSS panes to see live changes.</p>
  <button class="spark-btn">Click me</button>
</div>`;

const DEFAULT_CSS = `.spark-card {
  font-family: system-ui, sans-serif;
  padding: 24px;
  border-radius: 12px;
  background: #ffffff;
  color: #1a1a2e;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  max-width: 360px;
}
.spark-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #576FEF;
  color: white;
  font-weight: 600;
  cursor: pointer;
}`;

interface VaultProject {
  name: string;
  html: string;
  css: string;
}

export default function SparkApp() {
  const { toast } = useToast();
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [projectName, setProjectName] = useState('untitled');
  const [vault, setVault] = useState<string[]>([]);

  useEffect(() => {
    const index = window.localStorage.getItem(VAULT_INDEX_KEY);
    if (index) setVault(JSON.parse(index));
  }, []);

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`,
    [html, css]
  );

  async function handleGenerate() {
    if (!description.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await generateComponentCode(description);
      setHtml(result.html);
      setCss(result.css);
      toast({ title: 'Component generated', description: 'HTML and CSS panes updated.' });
    } catch (err) {
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setGenerating(false);
    }
  }

  function handleRefresh() {
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setDescription('');
    setProjectName('untitled');
    setGenerating(false);
  }

  function saveProject() {
    const name = projectName.trim() || 'untitled';
    const project: VaultProject = { name, html, css };
    window.localStorage.setItem(VAULT_PREFIX + name, JSON.stringify(project));
    const next = Array.from(new Set([...vault, name]));
    setVault(next);
    window.localStorage.setItem(VAULT_INDEX_KEY, JSON.stringify(next));
    toast({ title: 'Saved', description: `"${name}" added to the vault.` });
  }

  function loadProject(name: string) {
    const raw = window.localStorage.getItem(VAULT_PREFIX + name);
    if (!raw) return;
    const project: VaultProject = JSON.parse(raw);
    setProjectName(project.name);
    setHtml(project.html);
    setCss(project.css);
  }

  function deleteProject(name: string) {
    window.localStorage.removeItem(VAULT_PREFIX + name);
    const next = vault.filter((n) => n !== name);
    setVault(next);
    window.localStorage.setItem(VAULT_INDEX_KEY, JSON.stringify(next));
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="font-headline text-base font-bold tracking-tight">Vicious Spark</h2>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Reactive HTML/CSS component pipeline
          </span>
          <Button size="sm" variant="ghost" onClick={handleRefresh} title="Refresh tab">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border p-3">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe a component, e.g. 'a pricing card with a CTA button'"
          className="max-w-md"
        />
        <Button size="sm" onClick={handleGenerate} disabled={!description.trim() || generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? 'Generating…' : 'Generate'}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="project name"
            className="w-40"
          />
          <Button size="sm" variant="outline" onClick={saveProject}>
            <Save className="mr-2 h-4 w-4" />
            Save to vault
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-3">
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            HTML
          </div>
          <Textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="h-full flex-1 resize-none rounded-none border-none font-code text-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            CSS
          </div>
          <Textarea
            value={css}
            onChange={(e) => setCss(e.target.value)}
            className="h-full flex-1 resize-none rounded-none border-none font-code text-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col">
          <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Preview
          </div>
          <iframe
            title="Spark preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="h-full w-full flex-1 bg-white"
          />
        </div>
      </div>

      {vault.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-2">
          {vault.map((name) => (
            <div
              key={name}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
            >
              <button className="font-medium hover:underline" onClick={() => loadProject(name)}>
                {name}
              </button>
              <button
                onClick={() => deleteProject(name)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
