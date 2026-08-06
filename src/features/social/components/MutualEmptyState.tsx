"use client";

/**
 * `MutualEmptyState` — Empty-state component for the Story 6.4
 * mutual surfaces.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B4.
 *
 * ## What this component owns
 *
 * The empty-state copy for the mutual surfaces (preview + list
 * pages). The component takes a `variant: 'friends' | 'followers'`
 * so the copy is variant-specific. The copy is intentionally generic —
 * the variant selector never reveals relationship state.
 *
 * ## Why a Client Component
 *
 * Marked `"use client"` for parity with the other list primitives
 * (`SocialListSkeleton`, `SocialListErrorState`, etc.). The component
 * is purely presentational; no hooks are called.
 */

import { type ReactElement } from "react";

import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";

interface MutualEmptyStateProps {
  /** The mutual surface the empty state represents. */
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
