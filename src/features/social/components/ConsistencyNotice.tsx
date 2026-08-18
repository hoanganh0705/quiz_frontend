"use client";

import { type ReactElement } from "react";

import { cn } from "@/shared/utils/merge-class-names";

export type ConsistencyStaleness = "fresh" | "recent" | "stale";

export type ConsistencyTone = "info" | "warning";

interface ConsistencyNoticeProps {

staleness: ConsistencyStaleness;

lastUpdatedAt?: string;

tone?: ConsistencyTone;
}

const COPY: Record<Exclude<ConsistencyStaleness, "fresh">, string> = {
recent: "Updated just now",
stale:
"Counts may be up to a few minutes behind. This is normal for social analytics.",
};

export function ConsistencyNotice({
staleness,
tone = "info",
}: ConsistencyNoticeProps): ReactElement | null {
if (staleness === "fresh") return null;

const copy = COPY[staleness];

return (
<p
role="status"
data-testid={`consistency-notice-${staleness}`}
data-tone={tone}
aria-live="polite"
className={cn(
"text-xs",
tone === "warning"
? "text-amber-700 dark:text-amber-400"
: "text-muted-foreground",
      )}
    >
{copy}
</p>
  );
}