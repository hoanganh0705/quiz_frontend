"use client";

import type { ReactElement } from "react";

export function SocialSearchPlaceholder(): ReactElement {
return (
<section
data-testid="social-search-placeholder"
aria-label="Social user search (placeholder)"
className="flex flex-col gap-4 p-6"
    >
{/* Search input shell */}
<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
<div className="flex-1">
<div className="h-4 w-32 rounded bg-muted animate-pulse" />
</div>
</div>

{/* Placeholder copy */}
<div className="flex flex-col gap-2 text-center py-8">
<p className="text-base font-semibold">Search coming soon</p>
<p className="text-sm text-muted-foreground">
Find people to follow and connect with.
        </p>
</div>
</section>
  );
}
