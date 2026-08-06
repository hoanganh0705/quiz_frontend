"use client";

/**
 * `FollowButton` — Social follow / unfollow CTA component.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E1.
 *
 * ## Purpose
 *
 * The primary follow/unfollow call-to-action rendered on user profile pages
 * and social list rows. It composes:
 *
 *   - `useRelationship`  — reads the viewer's current relationship to the
 *                         target user. Short-circuits to `{ relationship: 'none' }`
 *                         when `phase6_social_follow_mutation === 'placeholder'`.
 *   - `useSocialPermissions` — derives `canFollow` / `canUnfollow`.
 *   - `useFollow`        — executes the follow mutation with optimistic UI.
 *   - `useUnfollow`      — executes the unfollow mutation.
 *   - `SelfActionGate`   — hides the button when `targetUserId === currentUserId`.
 *   - `FollowPendingIndicator` — shown inline when `isPending === true`.
 *   - `FollowErrorBanner`     — shown below the button when `error !== null`.
 *
 * ## Confirm-dialog integration
 *
 * The "Following" button does NOT directly call `unfollow()`. It calls
 * `onUnfollowRequest()` so the parent controls when the
 * `UnfollowConfirmDialog` is open. This lets the parent compose the dialog
 * state without `FollowButton` knowing about it.
 */

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
  /** The user ID of the target account to follow/unfollow. */
  targetUserId: string;
  /**
   * Called when the user clicks the "Following" button.
   * The parent opens the `UnfollowConfirmDialog` in response.
   * This component does NOT directly call `unfollow()` — the dialog
   * owns the confirmation lifecycle.
   */
  onUnfollowRequest: () => void;
  /** Optional className passed to the outer wrapper div. */
  className?: string;
}

const BUTTON_BASE =
  "h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Social follow / unfollow CTA.
 *
 * All hooks are called unconditionally — the feature flag and permissions
 * guards are handled by the hooks themselves (which return safe no-op
 * result objects). This component only renders `null` for the four
 * post-hook states that have no UI: loading, unauthenticated, flag
 * placeholder, or no action available.
 */
export function FollowButton({
  targetUserId,
  onUnfollowRequest,
  className,
}: FollowButtonProps): ReactNode {
  // ── All hooks unconditionally (React hooks rules) ──────────────────
  const { relationship, isLoading } = useRelationship(targetUserId);
  const { canFollow, canUnfollow } = useSocialPermissions(targetUserId);
  const { follow, isPending: isFollowPending, error: followError } =
    useFollow(targetUserId);
  const { isPending: isUnfollowPending, error: unfollowError } =
    useUnfollow(targetUserId);

  // ── Derived ────────────────────────────────────────────────────────
  const isPending = isFollowPending || isUnfollowPending;
  const error: FollowErrorCode | null =
    (followError ?? unfollowError) ?? null;

  // ── Post-hook guard states (hooks return safe no-op objects, but
  //     we have nothing to render) ─────────────────────────────────
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
