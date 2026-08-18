"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

interface TournamentStaleStateProps {
onRetry?: () => void;
className?: string;
}

export function TournamentStaleState({
onRetry,
className,
}: TournamentStaleStateProps) {
return (
<div
className={cn(
"flex items-center gap-3 px-4 py-3 rounded-lg",
"bg-amber-50 dark:bg-amber-950/30",
"border border-amber-200 dark:border-amber-800",
"text-amber-800 dark:text-amber-200",
className,
      )}
role="alert"
    >
<AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
<p className="flex-1 text-sm">
This data may be outdated. The latest information could not be loaded.
      </p>
{onRetry && (
<Button
type="button"
variant="ghost"
size="sm"
onClick={onRetry}
className="gap-1.5 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
<RefreshCw className="h-3.5 w-3.5" aria-hidden />
Retry
        </Button>
      )}
</div>
  );
}
