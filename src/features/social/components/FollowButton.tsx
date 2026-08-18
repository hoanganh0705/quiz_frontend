"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { SelfActionGate } from "@/features/social/components/SelfActionGate";
import { FollowErrorBanner } from "@/features/social/components/FollowErrorBanner";
import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";
import type { FollowErrorCode } from "@/features/social/components/follow-error-copy";
import { useRelationship } from "@/features/social/hooks/useRelationship";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import { useFollow } from "@/features/social/hooks/useFollow";
import { useUnfollow } from "@/features/social/hooks/useUnfollow";

export interface FollowButtonProps {

targetUserId: string;

onUnfollowRequest: () => void;

className?: string;
}

const BUTTON_BASE =
"h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function FollowButton({
targetUserId,
onUnfollowRequest,
className,
}: FollowButtonProps): ReactNode {

const { relationship, isLoading } = useRelationship(targetUserId);
const { canFollow, canUnfollow } = useSocialPermissions(targetUserId);
const { follow, isPending: isFollowPending, error: followError } =
useFollow(targetUserId);
const { isPending: isUnfollowPending, error: unfollowError } =
useUnfollow(targetUserId);

const isPending = isFollowPending || isUnfollowPending;
const error: FollowErrorCode | null =
(followError ?? unfollowError) ?? null;

if (isLoading) return null;
if (!canFollow && !canUnfollow) return null;

return (
<SelfActionGate targetUserId={targetUserId} fallback={null}>
<div className={className} data-testid="follow-button-root">
{isPending ? (
<FollowPendingIndicator
text={relationship === "following" ? "Unfollowing..." : "Following..."}
size="md"
          />
        ) : (
<>
{relationship === "none" && canFollow ? (
<Button
type="button"
variant="default"
className={BUTTON_BASE}
data-testid="follow-button-follow"
aria-label="Follow this user"
onClick={() => {
void follow();
                }}
              >
<ArrowRightIcon
className="mr-1.5 inline-block h-4 w-4"
aria-hidden="true"
                />
Follow
              </Button>
            ) : null}

{relationship === "following" && canUnfollow ? (
<Button
type="button"
variant="secondary"
className={BUTTON_BASE}
data-testid="follow-button-following"
aria-label="Unfollow this user"
aria-pressed="true"
onClick={onUnfollowRequest}
              >
<CheckIcon
className="mr-1.5 inline-block h-4 w-4"
aria-hidden="true"
                />
Following
              </Button>
            ) : null}
</>
        )}

{error !== null && !isPending && (
<FollowErrorBanner
error={error}
onRetry={
relationship === "none" ? () => {
void follow();
              } : undefined
            }
          />
        )}
</div>
</SelfActionGate>
  );
}
