"use client";

import { type ReactElement } from "react";

import type { SocialListKind } from "./SocialListKind";

interface SocialListEmptyStateProps {

kind: SocialListKind;

viewerIsOwner: boolean;
}

interface EmptyCopy {
readonly title: string;
readonly body: string;
}

function copyFor(kind: SocialListKind, viewerIsOwner: boolean): EmptyCopy {
switch (kind) {
case "followers":
return viewerIsOwner
? {
title: "No followers yet",
body: "When people follow you, they'll show up here.",
          }
: {
title: "No followers yet",
body: "This user doesn't have any followers yet.",
          };
case "following":
return {
title: "Not following anyone yet",
body: "Follow other players to see their quiz activity here.",
      };
case "friends":
return {
title: "No friends yet",
body: "Send a friend request to start building your friends list.",
      };
case "blocked":
return {
title: "No blocked users",
body: "Users you block will appear here.",
      };
default: {

return {
title: "Nothing here yet",
body: "Check back soon.",
      };
    }
  }
}

export function SocialListEmptyState({
kind,
viewerIsOwner,
}: SocialListEmptyStateProps): ReactElement {
const copy = copyFor(kind, viewerIsOwner);
return (
<div
data-testid={`social-list-empty-state-${kind}`}
data-viewer-is-owner={viewerIsOwner ? "true" : "false"}
role="status"
aria-label={copy.title}
className="flex flex-col items-center gap-2 p-6 text-center"
    >
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</div>
  );
}