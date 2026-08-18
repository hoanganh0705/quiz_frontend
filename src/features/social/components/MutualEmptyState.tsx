"use client";

import { type ReactElement } from "react";

import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";

interface MutualEmptyStateProps {

variant: MutualPreviewKind;
}

const COPY: Record<MutualPreviewKind, { title: string; body: string }> = {
friends: {
title: "No mutual friends",
body: "You don't share any friends with this user yet.",
  },
followers: {
title: "No mutual followers",
body: "You don't share any followers with this user yet.",
  },
};

export function MutualEmptyState({ variant }: MutualEmptyStateProps): ReactElement {
const copy = COPY[variant];
return (
<div
role="status"
aria-live="polite"
data-testid={`mutual-empty-state-${variant}`}
data-variant={variant}
className="flex flex-col gap-2 p-6 text-center"
    >
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</div>
  );
}
