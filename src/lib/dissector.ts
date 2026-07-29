
import { DissectedFile, ProjectStructure } from './types';

export function dissectCodeBlob(blob: string): DissectedFile[] {
  // Regex to match markers like // FILE: path/to/file.ext or /* FILE: path/to/file.ext */
  const fileMarkerRegex = /(?:\/\/|\/\*)\s*FILE:\s*([^\s\*]+)\s*(?:\*\/)?/g;
  const parts = blob.split(fileMarkerRegex);
  
  if (parts.length < 3) {
    // If no markers found, treat the whole thing as a single unidentified file
    return [{
      path: 'main.ts',
      content: blob.trim(),
      language: 'typescript'
    }];
  }

  const dissected: DissectedFile[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i].trim();
    const content = parts[i + 1].trim();
    const ext = path.split('.').pop() || 'txt';
    
    dissected.push({
      path,
      content,
      language: getLanguageFromExt(ext)
    });
  }

  return dissected;
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'css': 'css',
    'html': 'html',
    'json': 'json',
    'md': 'markdown'
  };
  return map[ext] || 'text';
}

export function buildFileTree(files: DissectedFile[]) {
  const root: any = { name: 'root', type: 'folder', children: [] };

  files.forEach(file => {
    const segments = file.path.split('/');
    let current = root;

    segments.forEach((segment, idx) => {
      const isLast = idx === segments.length - 1;
      let existing = current.children.find((c: any) => c.name === segment);

      if (!existing) {
        existing = {
          name: segment,
          path: segments.slice(0, idx + 1).join('/'),
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : []
        };
        current.children.push(existing);
      }
      current = existing;
    });
  });

  return root.children;
}

export function detectFramework(blob: string): string {
  if (blob.includes('next') || blob.includes('Next.js')) return 'Next.js';
  if (blob.includes('react') || blob.includes('React')) return 'React';
  if (blob.includes('vue')) return 'Vue';
  if (blob.includes('express')) return 'Express';
  return 'Node.js/Vanilla';
}

export function extractDependencies(blob: string): string[] {
  const importRegex = /(?:import|from)\s+['"]([^'"].*?)['"]/g;
  const deps = new Set<string>();
  let match;
  while ((match = importRegex.exec(blob)) !== null) {
    const dep = match[1];
    if (dep.startsWith('.') || dep.startsWith('@/')) continue;
    // Get root package name (e.g., @radix-ui/react-button -> @radix-ui/react-button or lodash/map -> lodash)
    const parts = dep.split('/');
    if (dep.startsWith('@')) {
      deps.add(`${parts[0]}/${parts[1]}`);
    } else {
      deps.add(parts[0]);
    }
  }
  return Array.from(deps);
}
