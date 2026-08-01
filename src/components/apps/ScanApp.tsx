'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ScanLine, Save, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveOutput, listOutputs, deleteOutput, type SavedOutput } from '@/lib/outputVault';

const TAB_KEY = 'scan';
const DRAFT_KEY = 'ViciousSuite_Scan_draft';

// Common permissions/dependencies most Android projects end up needing.
// Flagged as "suggested" if not already present in the pasted manifest/gradle.
const COMMON_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.ACCESS_FINE_LOCATION',
];

const COMMON_DEPENDENCIES = [
  'androidx.core:core-ktx',
  'androidx.appcompat:appcompat',
  'com.google.android.material:material',
  'androidx.constraintlayout:constraintlayout',
  'androidx.lifecycle:lifecycle-runtime-ktx',
];

interface ScanResult {
  foundPermissions: string[];
  missingPermissions: string[];
  foundDependencies: string[];
  missingDependencies: string[];
}

function scanInput(input: string): ScanResult {
  const permMatches = Array.from(
    input.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)
  ).map((m) => m[1]);

  const depMatches = Array.from(
    input.matchAll(/(?:implementation|api|kapt|ksp)\s*[\(\s]["']([^"':]+:[^"':]+)(?::[^"']*)?["']/g)
  ).map((m) => m[1]);

  const foundPermissions = Array.from(new Set(permMatches));
  const foundDependencies = Array.from(new Set(depMatches));

  const missingPermissions = COMMON_PERMISSIONS.filter((p) => !foundPermissions.includes(p));
  const missingDependencies = COMMON_DEPENDENCIES.filter(
    (d) => !foundDependencies.some((f) => f.startsWith(d))
  );

  return { foundPermissions, missingPermissions, foundDependencies, missingDependencies };
}

export default function ScanApp() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [selectedDeps, setSelectedDeps] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<SavedOutput[]>(() =>
    typeof window !== 'undefined' ? listOutputs(TAB_KEY) : []
  );

  const injectedOutput = useMemo(() => {
    if (!result) return '';
    const permLines = Array.from(selectedPerms).map(
      (p) => `<uses-permission android:name="${p}" />`
    );
    const depLines = Array.from(selectedDeps).map(
      (d) => `implementation("${d}:latest.release")`
    );
    const sections: string[] = [];
    if (permLines.length) {
      sections.push('-- Permissions to add to AndroidManifest.xml --\n' + permLines.join('\n'));
    }
    if (depLines.length) {
      sections.push('-- Dependencies to add to build.gradle --\n' + depLines.join('\n'));
    }
    return sections.join('\n\n');
  }, [result, selectedPerms, selectedDeps]);

  function handleScan() {
    if (!input.trim()) return;
    const r = scanInput(input);
    setResult(r);
    setSelectedPerms(new Set());
    setSelectedDeps(new Set());
    toast({
      title: 'Scan complete',
      description: `${r.foundPermissions.length} permission(s), ${r.foundDependencies.length} dependenc${r.foundDependencies.length === 1 ? 'y' : 'ies'} found.`,
    });
  }

  function togglePerm(p: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleDep(d: string) {
    setSelectedDeps((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  }

  function handleRefresh() {
    setInput('');
    setResult(null);
    setSelectedPerms(new Set());
    setSelectedDeps(new Set());
    window.localStorage.removeItem(DRAFT_KEY);
  }

  function handleSave() {
    if (!injectedOutput.trim()) return;
    const entry = saveOutput(TAB_KEY, `Scan ${new Date().toLocaleString()}`, injectedOutput);
    setSaved((prev) => [entry, ...prev]);
    toast({ title: 'Saved', description: 'Scan output saved.' });
  }

  function handleDelete(id: string) {
    deleteOutput(TAB_KEY, id);
    setSaved((prev) => prev.filter((o) => o.id !== id));
  }

  function handleLoad(entry: SavedOutput) {
    setInput(entry.content);
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-headline text-xl font-semibold">Vicious Scan</h2>
          <p className="text-xs text-muted-foreground">
            Paste an AndroidManifest.xml and/or build.gradle. Scans for permissions and
            dependencies, flags common ones you're missing, and lets you inject additions.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleRefresh} title="Refresh tab">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste AndroidManifest.xml and/or build.gradle contents..."
        className="min-h-[200px] font-code text-sm"
      />

      <Button onClick={handleScan} disabled={!input.trim()}>
        <ScanLine className="mr-2 h-4 w-4" />
        Scan
      </Button>

      {result && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-input bg-card p-3">
            <h3 className="mb-2 text-sm font-medium">Permissions found ({result.foundPermissions.length})</h3>
            <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
              {result.foundPermissions.length === 0 && <li>None detected.</li>}
              {result.foundPermissions.map((p) => (
                <li key={p} className="font-code">{p}</li>
              ))}
            </ul>
            {result.missingPermissions.length > 0 && (
              <>
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                  Commonly needed, not found — tap to add:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.missingPermissions.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePerm(p)}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-code ${
                        selectedPerms.has(p)
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {p.replace('android.permission.', '')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-input bg-card p-3">
            <h3 className="mb-2 text-sm font-medium">Dependencies found ({result.foundDependencies.length})</h3>
            <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
              {result.foundDependencies.length === 0 && <li>None detected.</li>}
              {result.foundDependencies.map((d) => (
                <li key={d} className="font-code">{d}</li>
              ))}
            </ul>
            {result.missingDependencies.length > 0 && (
              <>
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                  Commonly needed, not found — tap to add:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.missingDependencies.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDep(d)}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-code ${
                        selectedDeps.has(d)
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {injectedOutput && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Injection output</h3>
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save output
            </Button>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-input bg-card p-3 font-code text-xs">
            {injectedOutput}
          </pre>
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
                <button className="font-medium hover:underline" onClick={() => handleLoad(entry)}>
                  {entry.label}
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
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
