"use client";

/**
 * `FriendRequestCta` — Social friend-request CTA component.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E2.
 *
 * ## Purpose
 *
 * The primary call-to-action rendered on user profile pages. The
 * CTA label, icon, and onClick handler are derived from the
 * `friend-request-state-machine.ts` state machine — this component
 * is the consumer, not the source of truth.
 *
 * The component:
 *
 *   - Reads `useRelationship(targetUserId)` (Epic 6.1 / TKT-6.1.D1).
 *   - Reads `useSocialPermissions(targetUserId)` (Epic 6.1 / TKT-6.1.D2).
 *   - Calls `useSendFriendRequest(targetUserId)` (TKT-6.8.D1).
 *   - Calls `useUnfriend(targetUserId)` (TKT-6.8.D4).
 *   - Resolves the UI state via `resolveFriendRequestUiState`
 *     (TKT-6.8.E1).
 *   - Opens `FriendRequestCancelDialog` when the outgoing CTA is
 *     clicked.
 *   - Opens `UnfriendConfirmDialog` when the friend CTA is clicked.
 *   - Opens `FriendRequestRespondActions` when the incoming CTA is
 *     clicked (the CTA passes the `friendshipId` via the action
 *     slot so the popover can call the respond hook).
 *
 * ## Feature flag gating
 *
 * When `social_friend_request_mutation_live === 'placeholder'`,
 * the CTA renders nothing. This lets Phase 5 / 6.1 / 6.2 / 6.6
 * / 6.7 code paths install and run without Epic 6.8 CTAs visible.
 *
 * ## Self-action / blocked gates
 *
 * The CTA is wrapped in `SelfActionGate` (gates when the viewer is
 * the target) and `BlockedContentGate` (gates when either party has
 * blocked the other).
 *
 * ## Service-only / hook-only access
 *
 * The component does NOT import the `friend-request-mutation.service`
 * module. All mutation access is via the four hooks
 * (`useSendFriendRequest`, `useUnfriend`, etc.) — lint enforces
 * this invariant.
 */

import { type ReactElement, useState } from "react";
import {
  Ban,
  Clock,
  Loader,
  RefreshCw,
  UserCheck,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { FriendRequestCancelDialog } from "@/features/social/components/FriendRequestCancelDialog";
import { FriendRequestErrorBanner } from "@/features/social/components/FriendRequestErrorBanner";
import { FriendRequestRespondActions } from "@/features/social/components/FriendRequestRespondActions";
import { SelfActionGate } from "@/features/social/components/SelfActionGate";
import {
  FRIEND_REQUEST_CTA_TESTIDS,
  type FriendRequestActionKind,
  type FriendRequestUiState,
  resolveFriendRequestUiState,
} from "@/features/social/components/friend-request-state-machine";
import { useRelationship } from "@/features/social/hooks/useRelationship";
import { useSendFriendRequest } from "@/features/social/hooks/useSendFriendRequest";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";
import { useUnfriend } from "@/features/social/hooks/useUnfriend";
import { UnfriendConfirmDialog } from "@/features/social/components/UnfriendConfirmDialog";

// ─── Public types ─────────────────────────────────────────────────────────

export interface FriendRequestCtaProps {
  /**
   * The target user's stable identifier.
   */
  readonly targetUserId: string;
  /**
   * The `friendshipId` of the incoming request, if any. The CTA
   * forwards this to the `FriendRequestRespondActions` popover so
   * the popover can call `useRespondFriendRequest` with the right
   * path parameter.
   */
  readonly incomingFriendshipId?: string | null;
  /**
   * The `friendshipId` of the outgoing request, if any. The CTA
   * forwards this to the `FriendRequestCancelDialog` so the dialog
   * can call `useCancelFriendRequest` with the right path
   * parameter.
   */
  readonly outgoingFriendshipId?: string | null;
  /** Optional CSS className override. */
  readonly className?: string;
}

// ─── Icon resolver ───────────────────────────────────────────────────────

function iconFor(state: FriendRequestUiState): ReactElement {
  switch (state.icon) {
    case "UserPlus":
      return <UserPlus className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
    case "UserCheck":
      return <UserCheck className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
    case "Clock":
      return <Clock className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
    case "Ban":
      return <Ban className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
    case "Loader":
      return <Loader className="mr-1.5 inline-block h-4 w-4 animate-spin" aria-hidden="true" />;
    case "RefreshCw":
      return <RefreshCw className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />;
    default: {
      const _exhaustive: never = state.icon;
      return _exhaustive;
    }
  }
}

const BUTTON_BASE =
  "h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Render the friend-request CTA for a target user.
 */
export function FriendRequestCta({
  targetUserId,
  incomingFriendshipId = null,
  outgoingFriendshipId = null,
  className,
}: FriendRequestCtaProps): ReactElement | null {
  // ── Feature flag ───────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue(
    "social_friend_request_mutation_live",
  );
  const isFlagPlaceholder = flagValue === "placeholder";

  // ── All hooks unconditionally (React hooks rules) ────────────────
  // Read the relationship so the state machine can map it.
  const { relationship, isLoading } = useRelationship(targetUserId);
  // Derive permissions.
  const { canFriendRequest, canUnfriend } = useSocialPermissions(targetUserId);
  // Send mutation hook. Unfriend is invoked via UnfriendConfirmDialog.
  const { send, isPending: isSendPending, error: sendError } =
    useSendFriendRequest(targetUserId);
  const { isPending: isUnfriendPending } = useUnfriend(targetUserId);

  // Local UI state — declared BEFORE the early return so hooks
  // are called unconditionally. The state values are unused when
  // `isFlagPlaceholder === true`, but the hook call still runs.
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);
  const [respondPopoverOpen, setRespondPopoverOpen] = useState(false);

  // ── Early return AFTER all hooks ─────────────────────────────────
  if (isFlagPlaceholder) {
    return null;
  }

  // ── Resolve the CTA state ──────────────────────────────────────────
  const isPending = isSendPending || isUnfriendPending;
  const localHookState = isPending
    ? ("pending" as const)
    : sendError !== null
      ? ("error" as const)
      : ("idle" as const);

  const ctaState = resolveFriendRequestUiState({
    relationship,
    localHookState,
    canFriendRequest,
    canUnfriend,
  });

  // ── Loading state (no relationship yet) ────────────────────────────
  if (isLoading) {
    return null;
  }

  // ── onClick dispatcher ─────────────────────────────────────────────
  const handleClick = () => {
    const action: FriendRequestActionKind = ctaState.onClick;
    switch (action) {
      case "send":
        send();
        return;
      case "openCancel":
        setCancelDialogOpen(true);
        return;
      case "openRespond":
        setRespondPopoverOpen(true);
        return;
      case "openUnfriend":
        setUnfriendDialogOpen(true);
        return;
      case null:
        return;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  };

  return (
    <SelfActionGate targetUserId={targetUserId} fallback={null}>
      <BlockedContentGate targetUserId={targetUserId} fallback={null}>
        <div
          data-testid="friend-request-cta-root"
          data-target-user-id={targetUserId}
          data-action-kind={ctaState.onClick ?? "none"}
          data-state-relationship={relationship}
          className={className}
        >
          <Button
            type="button"
            variant={
              ctaState.onClick === "openUnfriend"
                ? "secondary"
                : ctaState.onClick === "openCancel"
                  ? "secondary"
                  : "default"
            }
            className={BUTTON_BASE}
            data-testid={ctaState.dataTestid}
            aria-label={ctaState.ariaLabel}
            aria-pressed={
              ctaState.onClick === "openUnfriend" ? true : undefined
            }
            disabled={ctaState.disabled}
            onClick={handleClick}
          >
            {iconFor(ctaState)}
            {ctaState.label}
          </Button>

          {/* Outgoing-request cancel dialog (TKT-6.8.E3) */}
          {outgoingFriendshipId !== null && (
            <FriendRequestCancelDialog
              open={cancelDialogOpen}
              onOpenChange={setCancelDialogOpen}
              friendshipId={outgoingFriendshipId}
              targetUserId={targetUserId}
            />
          )}

          {/* Unfriend confirm dialog (TKT-6.8.E4) */}
          <UnfriendConfirmDialog
            open={unfriendDialogOpen}
            onOpenChange={setUnfriendDialogOpen}
            targetUserId={targetUserId}
          />

          {/* Inline respond popover (TKT-6.8.E3) */}
          {incomingFriendshipId !== null && (
            <FriendRequestRespondActions
              targetUserId={targetUserId}
              friendshipId={incomingFriendshipId}
              open={respondPopoverOpen}
              onOpenChange={setRespondPopoverOpen}
            />
          )}

          {/* Error banner — only when the send mutation fails. Unfriend
              errors are surfaced inside `UnfriendConfirmDialog`. */}
          {sendError !== null && !isPending && (
            <FriendRequestErrorBanner
              error={sendError}
              onAction={() => send()}
            />
          )}
        </div>
      </BlockedContentGate>
    </SelfActionGate>
  );
}

// Re-export the testid set so consumers can reference stable ids
// without stringly-typed lookups.
export { FRIEND_REQUEST_CTA_TESTIDS };
