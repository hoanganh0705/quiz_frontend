

import { type ReactElement } from "react";

const NOTICE_COPY = {
text: "Global feed — personalization coming soon",
ariaLabel: "Global feed notice",
} as const;

export function FeedGlobalNotice(): ReactElement {
return (
<div
role="status"
aria-label={NOTICE_COPY.ariaLabel}
data-testid="feed-global-notice"
className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b border-border"
    >
<span>{NOTICE_COPY.text}</span>
</div>
  );
}