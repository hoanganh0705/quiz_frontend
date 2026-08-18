"use client";

import NextLink from "next/link";
import { type ReactElement } from "react";

import {
PrivacyRestrictedNotice,
} from "@/features/social/components/PrivacyRestrictedNotice";

export interface FeedEmptyStateProps {

readonly kind: "empty" | "private_viewer" | "recently_blocked";
}

const EMPTY_COPY = {
title: "No activity yet",
body: "Check back soon — your feed will fill up as the community posts new quizzes, badges, and tournaments.",
} as const;

const RECENTLY_BLOCKED_COPY = {
title: "Some items are hidden",
body: "Some items are hidden because you recently blocked a user.",
linkLabel: "Manage blocked users",
linkHref: "/social/blocked",
} as const;

const ARIA_LABEL_BY_KIND = {
empty: "Feed is empty",
private_viewer: "Feed is not available",
recently_blocked: "Some feed items are hidden",
} as const;

export function FeedEmptyState({ kind }: FeedEmptyStateProps): ReactElement {
if (kind === "private_viewer") {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="feed"
      />
    );
  }

if (kind === "recently_blocked") {
return (
<section
data-testid="feed-empty-state"
data-empty-kind="recently_blocked"
role="status"
aria-label={ARIA_LABEL_BY_KIND.recently_blocked}
className="flex flex-col gap-2 p-6"
      >
<h2 className="text-lg font-semibold">{RECENTLY_BLOCKED_COPY.title}</h2>
<p className="text-sm text-muted-foreground">{RECENTLY_BLOCKED_COPY.body}</p>
<NextLink
href={RECENTLY_BLOCKED_COPY.linkHref}
data-testid="feed-empty-state-recently-blocked-link"
aria-label={RECENTLY_BLOCKED_COPY.linkLabel}
className="text-sm text-primary underline-offset-4 hover:underline self-start"
        >
{RECENTLY_BLOCKED_COPY.linkLabel}
</NextLink>
</section>
    );
  }

return (
<section
data-testid="feed-empty-state"
data-empty-kind="empty"
role="status"
aria-label={ARIA_LABEL_BY_KIND.empty}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{EMPTY_COPY.title}</h2>
<p className="text-sm text-muted-foreground">{EMPTY_COPY.body}</p>
</section>
  );
}