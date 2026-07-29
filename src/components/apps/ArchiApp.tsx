'use client';

import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { FileArchive, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/workbench/CodeEditor';
import { FileExplorer } from '@/components/workbench/FileExplorer';
import { StatusBar } from '@/components/workbench/StatusBar';
import { useToast } from '@/hooks/use-toast';
import {
  buildFileTree,
  detectFramework,
  dissectCodeBlob,
  extractDependencies,
} from '@/lib/dissector';
import { generateScaffold } from '@/lib/scaffolder';
import type { DissectedFile } from '@/lib/types';
import { generateCodebaseReadme } from '@/app/actions';

type Status = 'idle' | 'dissecting' | 'ready' | 'synthesizing';

export default function ArchiApp() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [files, setFiles] = useState<DissectedFile[]>([]);
  const [framework, setFramework] = useState<string>();
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const tree = useMemo(() => buildFileTree(files), [files]);

  function handleDissect() {
    setStatus('dissecting');
    setTimeout(() => {
      const dissected = dissectCodeBlob(input);
      const fw = detectFramework(input);
      const deps = extractDependencies(input);

      setFiles(dissected);
      setFramework(fw);
      setDependencies(deps);
      setSelectedPath(dissected[0]?.path ?? null);
      setStatus('ready');

      toast({
        title: 'Dissection complete',
        description: `Found ${dissected.length} file(s), ${deps.length} dependenc${deps.length === 1 ? 'y' : 'ies'}.`,
      });
    }, 300);
  }

  async function handleSynthesizeReadme() {
    if (files.length === 0) return;
    setStatus('synthesizing');
    try {
      const codebaseDescription = [
        `Framework: ${framework}`,
        `Dependencies: ${dependencies.join(', ') || 'none detected'}`,
        `Files:`,
        ...files.map((f) => `- ${f.path}\n${f.content.slice(0, 400)}`),
      ].join('\n');

      const readmeContent = await generateCodebaseReadme(codebaseDescription);

      setFiles((prev) => [
        ...prev.filter((f) => f.path !== 'README.md'),
        { path: 'README.md', content: readmeContent, language: 'markdown' },
      ]);
      setSelectedPath('README.md');
      toast({ title: 'README synthesized', description: 'Added README.md to the tree.' });
    } catch (err) {
      toast({
        title: 'Synthesis failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setStatus('ready');
    }
  }

  function handleRefresh() {
    setInput('');
    setFiles([]);
    setFramework(undefined);
    setDependencies([]);
    setSelectedPath(null);
    setStatus('idle');
  }

  async function handleExportZip() {
    if (files.length === 0) return;
    const zip = new JSZip();
    const scaffold = generateScaffold(framework ?? 'Node.js/Vanilla', dependencies);

    [...files, ...scaffold].forEach((f) => zip.file(f.path, f.content));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vicious-archi-export.zip';
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Export ready', description: 'vicious-archi-export.zip downloaded.' });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <h2 className="font-headline text-base font-bold tracking-tight">Vicious Archi</h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Intelligent Code Dissector &amp; AI Documentation Workbench
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleRefresh} title="Refresh tab">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSynthesizeReadme}
            disabled={files.length === 0 || status === 'synthesizing'}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Synthesize README
          </Button>
          <Button size="sm" onClick={handleExportZip} disabled={files.length === 0}>
            <FileArchive className="mr-2 h-4 w-4" />
            Export ZIP
          </Button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="border-b border-border md:border-b-0 md:border-r">
          <CodeEditor
            value={input}
            onChange={setInput}
            onDissect={handleDissect}
            isDissecting={status === 'dissecting'}
          />
        </div>
        <FileExplorer
          tree={tree}
          files={files}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
        />
      </main>

      <StatusBar
        framework={framework}
        fileCount={files.length}
        dependencyCount={dependencies.length}
        status={status}
      />
    </div>
  );
}
