

import type { ReactElement } from "react";

import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";

interface SocialMutualsPlaceholderProps {

kind: MutualPreviewKind;

targetUserId?: string | null;
}

const COPY: Record<
MutualPreviewKind,
{ title: string; description: string }
> = {
friends: {
title: "Mutual friends",
description:
"See the friends you share with this user. Sign in to view the full list.",
  },
followers: {
title: "Mutual followers",
description:
"See the followers you share with this user. Sign in to view the full list.",
  },
};

export function SocialMutualsPlaceholder({
kind,
targetUserId,
}: SocialMutualsPlaceholderProps): ReactElement {
const copy = COPY[kind];
return (
<section
data-testid={`social-mutuals-placeholder-${kind}`}
data-kind={kind}
data-target-user-id={targetUserId ?? undefined}
aria-label={`${copy.title} (placeholder)`}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{copy.title}</h2>
<p className="text-sm text-muted-foreground">{copy.description}</p>
</section>
  );
}
