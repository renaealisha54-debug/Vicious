// Shared "save output" utility used by Offline, Archi, Script, and Scan.
// Each tab keeps its own list (separate localStorage key per tab), so
// nothing forces them into one combined vault — but the shape and the
// save/list/delete behavior is identical everywhere.

export interface SavedOutput {
  id: string;
  label: string;
  content: string;
  savedAt: number;
}

function keyFor(tab: string) {
  return `ViciousSuite_Outputs_${tab}`;
}

export function listOutputs(tab: string): SavedOutput[] {
  try {
    const raw = window.localStorage.getItem(keyFor(tab));
    return raw ? (JSON.parse(raw) as SavedOutput[]) : [];
  } catch {
    return [];
  }
}

export function saveOutput(tab: string, label: string, content: string): SavedOutput {
  const entry: SavedOutput = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: label.trim() || 'Untitled',
    content,
    savedAt: Date.now(),
  };
  const next = [entry, ...listOutputs(tab)].slice(0, 50); // cap at 50 per tab
  window.localStorage.setItem(keyFor(tab), JSON.stringify(next));
  return entry;
}

export function deleteOutput(tab: string, id: string): void {
  const next = listOutputs(tab).filter((o) => o.id !== id);
  window.localStorage.setItem(keyFor(tab), JSON.stringify(next));
}
