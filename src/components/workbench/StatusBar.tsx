import { cn } from '@/lib/utils';

interface StatusBarProps {
  framework?: string;
  fileCount: number;
  dependencyCount: number;
  status: 'idle' | 'dissecting' | 'ready' | 'synthesizing';
}

export function StatusBar({
  framework,
  fileCount,
  dependencyCount,
  status,
}: StatusBarProps) {
  const statusLabel: Record<StatusBarProps['status'], string> = {
    idle: 'Awaiting input',
    dissecting: 'Dissecting…',
    ready: 'Ready',
    synthesizing: 'Synthesizing README…',
  };

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-card px-4 font-code text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex items-center gap-1.5',
            status !== 'idle' && 'text-accent'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full bg-muted-foreground',
              (status === 'dissecting' || status === 'synthesizing') &&
                'animate-pulse bg-accent',
              status === 'ready' && 'bg-primary'
            )}
          />
          {statusLabel[status]}
        </span>
        {framework && <span>Framework: {framework}</span>}
      </div>
      <div className="flex items-center gap-4">
        <span>{fileCount} files</span>
        <span>{dependencyCount} deps</span>
      </div>
    </div>
  );
}
