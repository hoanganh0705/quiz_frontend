

import { type ReactElement } from "react";

export interface FeedStaleMarkerProps {

readonly isStale: boolean;
}

const STALE_COPY = {
text: "Updating...",
ariaLabel: "Feed is updating",
} as const;

export function FeedStaleMarker({
isStale,
}: FeedStaleMarkerProps): ReactElement | null {
if (!isStale) return null;

return (
<div
role="status"
aria-live="polite"
aria-label={STALE_COPY.ariaLabel}
data-testid="feed-stale-marker"
className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
    >
<span
aria-hidden="true"
data-testid="feed-stale-marker-pulse"
className="inline-block size-2 rounded-full bg-muted-foreground animate-pulse"
      />
<span>{STALE_COPY.text}</span>
</div>
  );
}