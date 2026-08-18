"use client";

import { type ReactElement, useEffect, useRef, useState } from "react";

import { useBlockedUsers } from "@/features/social/hooks/useBlockedUsers";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";
import { useUnblock } from "@/features/social/hooks/useUnblock";

import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { addSocialListBreadcrumb } from "@/lib/social/social-search-sentry";

import { BlockErrorBanner } from "../components/BlockErrorBanner";
import { SocialListEmptyState } from "../components/SocialListEmptyState";
import { SocialListErrorState } from "../components/SocialListErrorState";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { SocialListRow } from "../components/SocialListRow";
import { SocialListSkeleton } from "../components/SocialListSkeleton";
import { UnblockConfirmDialog } from "../components/UnblockConfirmDialog";

const BLOCKED_NOT_FOUND_CODES = new Set<string>([
"GLOBAL_NOT_FOUND",
"USER_NOT_FOUND",
]);

function isPermissionDeniedError(error: ApiError | null): boolean {
if (error === null) return false;
if (typeof error.code === "string" && BLOCKED_NOT_FOUND_CODES.has(error.code)) {
return true;
  }
return error.status === 404 || error.status === 403;
}

function BlockedUserRowWithUnblock({
userId,
displayName,
}: {
userId: string;
displayName: string;
}): ReactElement {
const [dialogOpen, setDialogOpen] = useState(false);
const { unblock, isPending, error } = useUnblock(userId);

const flagValue = getFeatureFlagValue("social_block_mutation_live");
const isFlagPlaceholder = flagValue === "placeholder";

return (
<div className="flex items-center justify-between gap-3">
<span className="text-sm text-muted-foreground">
Unblock {displayName}
</span>
{!isFlagPlaceholder && (
<>
<button
type="button"
className="shrink-0 rounded border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
data-testid={`blocked-user-row-unblock-${userId}`}
aria-label={`Unblock ${displayName}`}
disabled={isPending}
onClick={() => {
setDialogOpen(true);
            }}
          >
Unblock
          </button>

<UnblockConfirmDialog
open={dialogOpen}
onOpenChange={setDialogOpen}
onConfirm={() => {
setDialogOpen(false);
void unblock();
            }}
isPending={isPending}
          />

{error !== null && !isPending && (
<BlockErrorBanner
error={error}
            />
          )}
</>
      )}
</div>
  );
}

export function BlockedUsersList(): ReactElement {

const visibility = useSocialListVisibility(null);

const { users, isLoading, isStale, error, retry } = useBlockedUsers();

const isFlagPlaceholder =
getFeatureFlagValue("social_block_mutation_live") === "placeholder";
const showUnblockAffordance = !isFlagPlaceholder;

const prevFetchStateRef = useRef<"loading" | "done" | "error">(
isLoading ? "loading" : error !== null ? "error" : "done",
  );
useEffect(() => {
if (!visibility.canViewBlocked) return;
const next: "loading" | "done" | "error" = isLoading
? "loading"
: error !== null
? "error"
: "done";
if (prevFetchStateRef.current === next) return;
prevFetchStateRef.current = next;
addSocialListBreadcrumb({
kind: "blocked",
targetUserId: "self",
offset: 0,
limit: users.length,
total: users.length,
status: error !== null ? error.status : 200,
code: error !== null ? error.code : undefined,
    });
  }, [visibility.canViewBlocked, isLoading, error, users.length]);

if (!visibility.canViewBlocked) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />
    );
  }

if (isPermissionDeniedError(error)) {
return (
<PrivacyRestrictedNotice
variant="not_available"
resourceKind="blocked"
      />
    );
  }

if (isLoading && users.length === 0) {
return <SocialListSkeleton />;
  }

if (error !== null && users.length === 0) {
return (
<SocialListErrorState
error={error}
isStale={isStale}
onRetry={() => {
void retry();
        }}
      />
    );
  }

if (users.length === 0) {
return <SocialListEmptyState kind="blocked" viewerIsOwner={true} />;
  }

return (
<section
data-testid="blocked-users-list"
aria-label="Blocked users"
className="flex flex-col gap-2"
    >
<ul className="flex flex-col gap-1">
{users.map((blocked) => (
<li key={blocked.userId}>
<SocialListRow user={blocked} variant="blocked" />
<span className="text-xs text-muted-foreground">
Blocked since {blocked.since.slice(0, 10)}
</span>
{showUnblockAffordance ? (
<BlockedUserRowWithUnblock
userId={blocked.userId}
displayName={
blocked.user.displayName ?? blocked.user.userName
                }
              />
            ) : null}
</li>
        ))}
</ul>
</section>
  );
}