"use client";

import type { ReactElement } from "react";

import type { SocialListKind as _SocialListKind } from "./SocialListKind";

export type SocialListKind = _SocialListKind;

interface SocialListPlaceholderProps {

kind: SocialListKind;

targetUserId?: string | null;
}

const COPY: Record<
SocialListKind,
{ title: string; description: string }
> = {
followers: {
title: "Followers",
description: "See who follows this user. Sign in to view the full list.",
  },
following: {
title: "Following",
description: "See who this user follows. Sign in to view the full list.",
  },
friends: {
title: "Friends",
description: "See this user's friends. Sign in to view the full list.",
  },
blocked: {
title: "Blocked users",
description:
"See the users you have blocked. Sign in to view your full list.",
  },
"mutual-friends": {
title: "Mutual friends",
description: "See the friends you share with this user.",
  },
"mutual-followers": {
title: "Mutual followers",
description: "See the followers you share with this user.",
  },
activity: {
title: "Activity",
description: "See this user's recent activity.",
  },
feed: {
title: "Feed",
description: "See the latest community activity.",
  },
};

export function SocialListPlaceholder({
kind,
}: SocialListPlaceholderProps): ReactElement {
const copy = COPY[kind];
return (
<section
data-testid={`social-list-placeholder-${kind}`}
aria-label={`${copy.title} (placeholder)`}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{copy.title}</h2>
<p className="text-sm text-muted-foreground">{copy.description}</p>
</section>
  );
}