"use client";

import { type ReactElement } from "react";

interface ActivityEmptyStateProps {

isBlocked?: boolean;
}

export function ActivityEmptyState({
isBlocked = false,
}: ActivityEmptyStateProps = {}): ReactElement {
const copy = isBlocked
? {
title: "Activity is hidden",
body: "Activity is hidden because of a block between you and this user.",
      }
: {
title: "No activity yet",
body: "When this user is active on the platform, their activity will land here.",
      };

return (
<div
role="status"
aria-live="polite"
data-testid="activity-empty-state"
data-blocked={isBlocked ? "true" : "false"}
className="flex flex-col gap-2 p-6 text-center"
    >
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</div>
  );
}
