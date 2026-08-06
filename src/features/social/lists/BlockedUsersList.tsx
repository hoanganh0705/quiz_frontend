"use client";

/**
 * `BlockedUsersList` — Viewer's blocked users list page component.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views (initial
 *                implementation) and Epic 6.7 — Block and Unblock with
 *                Bidirectional Side Effects (TKT-6.7.E2 unblock
 *                affordance extension).
 * Source story:  Story 6.2 (read-only) + Story 6.7 (unblock affordance).
 * Source ticket: TKT-6.2.F2 (initial) + TKT-6.7.E2 (unblock).
 *
 * ## What this component owns
 *
 * The blocked-users surface. The component differs from
 * the friends / followers list:
 *
 *   - **Owner-only.** The blocked list is implicit on the viewer
 *     (the endpoint is `GET /social/blocked`, not
 *     `GET /social/users/{id}/blocked`). The component reads
 *     `useSocialListVisibility(null)` (the "me" sentinel) and
 *     renders `PrivacyRestrictedNotice(variant: 'not_available')`
 *     when `canViewBlocked === false`. The data hook
 *     (`useBlockedUsers`) is NOT called in that branch.
 *
 *   - **Row variant is `blocked`.** `SocialListRow variant="blocked"`
 *     suppresses row-level action CTAs (block / unblock controls
 *     live on the list page, not on the row — see
 *     `SocialListRow.spec.tsx` for the AC).
 *
 *   - **Single-page list.** The backend's blocked-list endpoint is
 *     not paginated (a viewer has bounded lists). The component
 *     therefore does not render a "Load more" button.
 *
 * ## Epic 6.7 / TKT-6.7.E2 — unblock affordance
 *
 * Each row exposes an Unblock button that opens an inline
 * `UnblockConfirmDialog`. On confirm, the row calls `useUnblock().unblock()`,
 * which:
 *
 *   1. Issues `DELETE /social/block/:userId`.
 *   2. On success (204), revalidates the relationship, blocked-users,
 *      and counts SWR keys. The blocked-list revalidation removes the
 *      row from the list automatically.
 *   3. On `SOCIAL_USER_NOT_BLOCKED` (404), treats it as a successful
 *      terminal state and revalidates the cache.
 *   4. On other errors, surfaces `BlockErrorBanner` inline.
 *
 * The unblock affordance is gated by `phase6_social_block_mutation`
 * (Epic 6.7 / TKT-6.7.B1). When the flag is `'placeholder'`, the
 * `useUnblock` hook returns a no-op result and the buttons are not
 * rendered.
 *
 * ## Why the "me" sentinel for visibility
 *
 * `useSocialListVisibility` is keyed by a target user id; the
 * blocked list has no target. Passing `null` makes the visibility
 * selector return `canViewBlocked === isOwner`, which is what we
 * want when the viewer is the implicit owner of the list.
 */

import { type ReactElement, useEffect, useRef, useState } from "react";

import { useBlockedUsers } from "@/features/social/hooks/useBlockedUsers";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";
import { useUnblock } from "@/features/social/hooks/useUnblock";

import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { addSocialListBreadcrumb } from "@/lib/social/phase6_6_2_sentry";

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

/**
 * Single blocked-user row with an inline unblock affordance.
 *
 * The component is owned by `BlockedUsersList` (TKT-6.7.E2). It is
 * intentionally co-located with the parent because the dialog state
 * is per-row; promoting it to a standalone file would require an
 * extra props surface for the dialog state.
 *
 * The unblock affordance is gated by `phase6_social_block_mutation`.
 * When the flag is `'placeholder'`, the hook returns safe no-op
 * result objects and the button renders `null`.
 */
function BlockedUserRowWithUnblock({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { unblock, isPending, error } = useUnblock(userId);

  // Hide the unblock affordance when the feature flag is off. The
  // hook itself returns a no-op under `'placeholder'`, but we also
  // want to hide the button so the UI matches the gating intent.
  const flagValue = getFeatureFlagValue("phase6_social_block_mutation");
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
  // Hooks must be called unconditionally. The blocked-users hook's
  // SWR key factory short-circuits to `null` when `canViewBlocked`
  // is false, so calling it unconditionally is the same as
  // "not calling it" from a data-fetching perspective, but does
  // not violate the React Hooks rules-of-hooks invariant.
  const visibility = useSocialListVisibility(null);

  const { users, isLoading, isStale, error, retry } = useBlockedUsers();

  // The unblock affordance is gated by the feature flag. The auth
  // gate is enforced by `useUnblock` itself (the hook returns a
  // no-op when the viewer is unauthenticated). We read the flag
  // here so the parent can decide whether to render the
  // affordance at all — this avoids spawning `useUnblock` instances
  // when the feature is gated off.
  const isFlagPlaceholder =
    getFeatureFlagValue("phase6_social_block_mutation") === "placeholder";
  const showUnblockAffordance = !isFlagPlaceholder;

  // TKT-6.2.H2 — emit a single `phase6:6.2` breadcrumb per fetch
  // transition. The blocked list is owner-only and not paginated,
  // so the offset/limit are fixed (0 / single-page) and the
  // visibility-gated branches are skipped (no fetch occurred).
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

  // 1. Privacy gate: render the notice before any rows render.
  if (!visibility.canViewBlocked) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="blocked"
      />
    );
  }

  // 2. 404 / 403 → privacy notice (defensive — the backend may
  //    return a 404 for a non-owner viewer).
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