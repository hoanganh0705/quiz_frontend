

import type { ReactElement } from "react";

interface SocialActivityPlaceholderProps {

targetUserId?: string | null;
}

export function SocialActivityPlaceholder({
targetUserId,
}: SocialActivityPlaceholderProps = {}): ReactElement {
return (
<section
data-testid="social-activity-placeholder"
data-target-user-id={targetUserId ?? undefined}
aria-label="Activity stream (placeholder)"
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">Activity</h2>
<p className="text-sm text-muted-foreground">
See this user&apos;s recent activity on the platform. Sign in to view
        the full stream.
      </p>
</section>
  );
}
