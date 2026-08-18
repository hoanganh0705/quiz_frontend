

import type { ReactElement } from "react";

interface SocialHubPlaceholderProps {

viewerDisplayName?: string | null;
}

export function SocialHubPlaceholder({
viewerDisplayName,
}: SocialHubPlaceholderProps): ReactElement {
const greeting = viewerDisplayName ? `Welcome back, ${viewerDisplayName}` : "Welcome back";
return (
<section
data-testid="social-hub-placeholder"
aria-label="Social Hub (placeholder)"
className="flex flex-col gap-3 p-6"
    >
<h2 className="text-lg font-semibold">{greeting}</h2>
<p className="text-sm text-muted-foreground">
Your social counts, my analytics, and the friend leaderboard
        will land here. Sign in to view the full hub.
      </p>
</section>
  );
}
