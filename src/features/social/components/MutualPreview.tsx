"use client";

import { type ReactElement } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import type { SocialListKind } from "@/features/social/components/SocialListKind";
import {
MUTUAL_PREVIEW_CAP,
mutualCountOverflow,
} from "@/features/social/mutual-count-invariants";
import type { SocialUserSummaryDto } from "@/features/social/types/relationship";

export type MutualPreviewVisibility =
| "visible"
  | "not_available"
  | "friends_only"
  | "auth_required"
  | "loading";

export type MutualPreviewKind = "friends" | "followers";

interface MutualPreviewProps {

targetUserId: string;

variant: MutualPreviewKind;

visibility: MutualPreviewVisibility;

mutuals: readonly SocialUserSummaryDto[];

total?: number;

className?: string;
}

function resourceKindFor(variant: MutualPreviewKind): SocialListKind {
return variant === "friends" ? "friends" : "followers";
}

const PRIVACY_BLOCKING: ReadonlySet<MutualPreviewVisibility> = new Set([
"not_available",
"friends_only",
"auth_required",
"loading",
]);

const EMPTY_COPY: Record<MutualPreviewKind, string> = {
friends: "No mutual friends",
followers: "No mutual followers",
};

export function MutualPreview(props: MutualPreviewProps): ReactElement {
const { targetUserId, variant, visibility, mutuals, total, className } = props;

if (PRIVACY_BLOCKING.has(visibility) || visibility !== "visible") {
const privacyVariant: "not_available" | "friends_only" =
visibility === "friends_only" ? "friends_only" : "not_available";
return (
<PrivacyRestrictedNotice
variant={privacyVariant}
resourceKind={resourceKindFor(variant)}
      />
    );
  }

if (mutuals.length === 0) {
return (
<div
role="status"
aria-live="polite"
data-testid={`mutual-preview-${variant}-empty`}
data-target-user-id={targetUserId}
data-variant={variant}
className={className}
      >
<p className="text-sm text-muted-foreground">{EMPTY_COPY[variant]}</p>
</div>
    );
  }

const visible = mutuals.slice(0, MUTUAL_PREVIEW_CAP);
const overflow = total !== undefined
? mutualCountOverflow(visible.length, total)
: 0;

return (
<div
role="list"
data-testid={`mutual-preview-${variant}`}
data-target-user-id={targetUserId}
data-variant={variant}
data-visible-count={visible.length}
data-total={total ?? null}
data-overflow={overflow}
className={className}
    >
<div className="flex items-center gap-2">
{visible.map((user) => (
<Link
key={user.id}
href={`/users/${encodeURIComponent(user.userId)}`}
data-testid="mutual-preview-avatar"
data-user-id={user.userId}
aria-label={`View profile for ${user.userName}`}
className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
<Avatar>
{user.avatarUrl !== null && (
<AvatarImage src={user.avatarUrl} alt={`${user.userName}'s avatar`} />
              )}
<AvatarFallback>{user.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
</Avatar>
</Link>
        ))}
{overflow > 0 && (
<Badge
data-testid="mutual-preview-overflow"
data-overflow={overflow}
variant="secondary"
aria-label={`${overflow} more`}
          >
+{overflow} more
          </Badge>
        )}
</div>
</div>
  );
}
