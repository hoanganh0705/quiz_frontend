

import type { ReactElement } from "react";

export function SocialFeedPlaceholder(): ReactElement {
return (
<section
data-testid="social-feed-placeholder"
aria-label="Global feed (placeholder)"
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">Global feed</h2>
<p className="text-sm text-muted-foreground">
See what&apos;s happening across the platform. Sign in to view
        the live feed.
      </p>
</section>
  );
}
