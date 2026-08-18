"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

export interface ConsistencyNoticeProps {

isStale: boolean;

lastValidatedAt?: string | null;

message?: string;
className?: string;
}

function formatTimestamp(iso: string): string {
const date = new Date(iso);
if (Number.isNaN(date.getTime())) return iso;
try {
return new Intl.DateTimeFormat(undefined, {
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
    }).format(date);
  } catch {
return date.toISOString();
  }
}

export function ConsistencyNotice({
isStale,
lastValidatedAt,
message = "Refreshing data…",
className,
}: ConsistencyNoticeProps) {
if (!isStale) return null;

const hasTimestamp =
typeof lastValidatedAt === "string" && lastValidatedAt.length > 0;

return (
<div
role="status"
aria-live="polite"
data-testid="consistency-notice"
className={cn(
"inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground",
className,
      )}
    >
<Loader2
aria-hidden="true"
className="h-3 w-3 animate-spin shrink-0"
      />
<span>{message}</span>
{hasTimestamp ? (
<span
aria-label={`Last validated at ${formatTimestamp(lastValidatedAt as string)}`}
className="font-mono tabular-nums text-muted-foreground/80"
        >
· {formatTimestamp(lastValidatedAt as string)}
</span>
      ) : null}
</div>
  );
}