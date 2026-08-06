"use client";

/**
 * `BlockButton` — Social block / unblock CTA component.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.E1.
 *
 * ## Purpose
 *
 * The primary block/unblock call-to-action rendered on user profile
 * pages and social list rows. It composes:
 *
 *   - `useRelationship`         — reads the viewer's current relationship
 *                                   to the target user. Short-circuits to
 *                                   `{ relationship: 'none' }` when the
 *                                   relationship flag is `'placeholder'`.
 *   - `useSocialPermissions`    — derives `canBlock` / `canUnblock`.
 *   - `useBlock`                — executes the block mutation.
 *   - `useUnblock`              — executes the unblock mutation.
 *   - `SelfActionGate`          — hides the button when
 *                                   `targetUserId === currentUserId`.
 *   - `BlockConfirmDialog`      — confirmation dialog before block.
 *   - `UnblockConfirmDialog`    — confirmation dialog before unblock.
 *   - `BlockErrorBanner`        — shown below the button when
 *                                   `error !== null`.
 *
 * ## Button ↔ dialog ↔ hook wiring
 *
 * The CTA renders one of two affordances based on the current
 * `Relationship`:
 *
 *   - `relationship === 'blocked'` → "Unblock" button (secondary variant).
 *   - any other `canBlock` state   → "Block" button (destructive variant).
 *
 * Both affordances are intrinsically destructive / transactional, so
 * neither calls the hook directly. Instead, they call the
 * `onBlockRequest` / `onUnblockRequest` callbacks, which the parent
 * uses to open the corresponding confirmation dialog. This component
 * owns the dialog state internally so the parent stays simple — the
 * dialogs are co-located with the button that triggers them.
 *
 * ## Feature flag gating
 *
 * `phase6_social_block_mutation` gates the entire component. When the
 * flag value is `'placeholder'`, the hooks return safe no-op result
 * objects (`canBlock === false`, `canUnblock === false`), and the
 * component renders `null`. The pattern is identical to `FollowButton`
 * (TKT-6.6.E1).
 *
 * ## Bidirectional side effects
 *
 * Block is bidirectional: when A blocks B, B cannot see A's content,
 * follow A, or send A a friend request. The server enforces this. The
 * client mirrors it via:
 *
 *   - `useSocialPermissions` — the blocked user sees no follow /
 *     friend-request CTAs.
 *   - `BlockedContentGate` (Epic 6.1) — wraps the viewer's content
 *     and hides it from the blocked user.
 *
 * When `relationship === 'blocked_by'` (the target has blocked the
 * viewer), `useSocialPermissions` returns the strictest permission set
 * (all `canX` flags `false`), so the button renders `null`. This is
 * the inverse-permission case required by the `BlockedContentGate`
 * pattern (TKT-6.7.E1 §10).
 *
 * ## Self-action gate
 *
 * `SelfActionGate` wraps the CTA: the button is never rendered when
 * `targetUserId === currentUserId`. The hook layer never makes a
 * service call in this case, so the CTA cannot leak through.
 *
 * ## Silent follow removal
 *
 * If A was previously following B and A blocks B, the server silently
 * removes that follow. The `useBlock` hook revalidates the relationship
 * and counts keys on success — this converges the UI without any
 * explicit error banner.
 *
 * ## Error handling
 *
 * `BlockErrorBanner` surfaces errors from either hook. The banner
 * displays code-specific copy from `block-error-copy.ts` and offers a
 * retry button for transient errors only (`GLOBAL_RATE_LIMITED`,
 * `GLOBAL_INTERNAL_ERROR`, `NETWORK_ERROR`).
 *
 * The `SOCIAL_USER_NOT_BLOCKED` code (the unblock 404) is consumed by
 * `useUnblock` itself and does NOT surface as a banner — it is a
 * successful terminal state.
 */

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Ban, ShieldCheck } from "lucide-react";

import { BlockConfirmDialog } from "@/features/social/components/BlockConfirmDialog";
import { BlockErrorBanner } from "@/features/social/components/BlockErrorBanner";
import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";
import { SelfActionGate } from "@/features/social/components/SelfActionGate";
import { UnblockConfirmDialog } from "@/features/social/components/UnblockConfirmDialog";
import type { BlockErrorCode } from "@/features/social/components/block-error-copy";
import { useBlock } from "@/features/social/hooks/useBlock";
import { useUnblock } from "@/features/social/hooks/useUnblock";
import { useRelationship } from "@/features/social/hooks/useRelationship";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export interface BlockButtonProps {
  /** The user ID of the target account to block/unblock. */
  targetUserId: string;
  /** Optional className passed to the outer wrapper div. */
  className?: string;
}

const BUTTON_BASE =
  "h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Social block / unblock CTA.
 *
 * All hooks are called unconditionally (React hooks rules). The
 * feature flag and permissions guards are handled by the hooks
 * themselves, which return safe no-op result objects. The component
 * renders `null` for the three post-hook states that have no UI:
 * loading, no-action-available.
 */
export function BlockButton({
  targetUserId,
  className,
}: BlockButtonProps): ReactNode {
  // ── All hooks unconditionally (React hooks rules) ──────────────────
  const { relationship, isLoading } = useRelationship(targetUserId);
  const { canBlock, canUnblock } = useSocialPermissions(targetUserId);
  const { block, isPending: isBlockPending, error: blockError } =
    useBlock(targetUserId);
  const { unblock, isPending: isUnblockPending, error: unblockError } =
    useUnblock(targetUserId);

  // ── Dialog state ────────────────────────────────────────────────────
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────
  const isPending = isBlockPending || isUnblockPending;
  const error: BlockErrorCode | null = (blockError ?? unblockError) ?? null;

  // ── Post-hook guard states (hooks return safe no-op objects, but
  //     we have nothing to render) ─────────────────────────────────
  if (isLoading) return null;
  if (!canBlock && !canUnblock) return null;

  // ── Affordance selection ──────────────────────────────────────────
  const isBlocked = relationship === "blocked";

  return (
    <SelfActionGate targetUserId={targetUserId} fallback={null}>
      <div className={className} data-testid="block-button-root">
        {isPending ? (
          <FollowPendingIndicator
            text={isBlocked ? "Unblocking..." : "Blocking..."}
            size="md"
          />
        ) : (
          <>
            {isBlocked && canUnblock ? (
              <Button
                type="button"
                variant="secondary"
                className={BUTTON_BASE}
                data-testid="block-button-unblock"
                aria-label="Unblock this user"
                aria-pressed="true"
                onClick={() => {
                  setUnblockDialogOpen(true);
                }}
              >
                <ShieldCheck
                  className="mr-1.5 inline-block h-4 w-4"
                  aria-hidden="true"
                />
                Unblock
              </Button>
            ) : null}

            {!isBlocked && canBlock ? (
              <Button
                type="button"
                variant="destructive"
                className={BUTTON_BASE}
                data-testid="block-button-block"
                aria-label="Block this user"
                onClick={() => {
                  setBlockDialogOpen(true);
                }}
              >
                <Ban
                  className="mr-1.5 inline-block h-4 w-4"
                  aria-hidden="true"
                />
                Block
              </Button>
            ) : null}
          </>
        )}

        {error !== null && !isPending && (
          <BlockErrorBanner
            error={error}
            onRetry={
              isBlocked
                ? () => {
                    void unblock();
                  }
                : () => {
                    void block();
                  }
            }
          />
        )}
      </div>

      {/* ── Confirm dialogs ────────────────────────────────────────── */}
      <BlockConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        onConfirm={() => {
          setBlockDialogOpen(false);
          void block();
        }}
        isPending={isBlockPending}
      />

      <UnblockConfirmDialog
        open={unblockDialogOpen}
        onOpenChange={setUnblockDialogOpen}
        onConfirm={() => {
          setUnblockDialogOpen(false);
          void unblock();
        }}
        isPending={isUnblockPending}
      />
    </SelfActionGate>
  );
}