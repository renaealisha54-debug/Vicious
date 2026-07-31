'use client';

import { useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileTreeItem, DissectedFile } from '@/lib/types';

interface FileExplorerProps {
  tree: FileTreeItem[];
  files: DissectedFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeNode({
  item,
  depth,
  selectedPath,
  onSelect,
}: {
  item: FileTreeItem;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isFolder = item.type === 'folder';

  return (
    <div className="animate-fade-in-right">
      <button
        onClick={() => (isFolder ? setOpen((o) => !o) : onSelect(item.path))}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-sm transition-colors hover:bg-secondary',
          selectedPath === item.path && 'bg-secondary text-accent'
        )}
      >
        {isFolder ? (
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-90'
            )}
          />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {isFolder && <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />}
        <span className="truncate font-code text-xs">{item.name}</span>
      </button>
      {isFolder && open && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  tree,
  files,
  selectedPath,
  onSelect,
}: FileExplorerProps) {
  const selectedFile = files.find((f) => f.path === selectedPath);

  if (tree.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Folder className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Dissect a code blob to see its architecture here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 pb-2">
        <h2 className="font-headline text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Architecture
        </h2>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="custom-scrollbar w-2/5 shrink-0 overflow-y-auto border-r border-border py-2">
          {tree.map((item) => (
            <TreeNode
              key={item.path}
              item={item}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
        <div className="custom-scrollbar flex-1 overflow-auto p-4">
          {selectedFile ? (
            <pre className="animate-line-dissect origin-left font-code text-xs leading-relaxed text-foreground/90">
              {selectedFile.content}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a file to preview its contents.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
