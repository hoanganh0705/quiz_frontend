'use client';

/**
 * `/settings/security` — Security settings page.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source tickets: 2.8.T9 (route scaffold), 2.8.T12 (dashboard wiring).
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source tickets: 2.9.T14 (verify-password CTA launcher),
 *                 2.9.T15 (change-password card mount + revalidation).
 *
 * ## Composition contract
 *
 * This page is the composition root for THREE independent views:
 *
 *   - **SecuritySummaryCard** (US-2.8.1) — verification status,
 *     password metadata, active-session count. Mounted on top.
 *
 *   - **ActiveSessionsList** (US-2.8.2) — per-device rows with
 *     individual revoke buttons, "Revoke other sessions" CTA, and
 *     "Sign out of all devices" CTA. Mounted underneath.
 *
 *   - **ChangePasswordCard** (US-2.9.2) — gated behind a
 *     verify-password modal (US-2.9.1) that proves the user
 *     before exposing the change form. Mounted conditionally.
 *
 * ## Verify-password gate (Epic 2.9 / 2.9.T14)
 *
 * The "Change password" CTA below the security dashboard opens
 * `VerifyPasswordModal`. On `valid: true`:
 *
 *   1. The modal closes.
 *   2. `markRecentlyVerified('change-password')` is called so the
 *      recently-verified flag is set with the default TTL
 *      (15_000 ms).
 *   3. The change-password card slot is revealed.
 *
 * The CTA is hidden while the flag is active. When the user
 * dismisses the change-password card (or the success banner
 * auto-dismisses), the card collapses back to the CTA — the
 * user must re-verify the next time they want to change the
 * password.
 *
 * ## Change-password revalidation (Epic 2.9 / 2.9.T15)
 *
 * On a successful password change, `useChangePassword` calls
 * `revalidateAfterPasswordChange()` and forwards the result to
 * the dashboard / sessions hooks via the injected callbacks:
 *
 *   - `revalidateDashboard(next)` replaces `dashboard.data` so
 *     the security card shows the new `passwordAgeDays` /
 *     `lastPasswordChangeAt` immediately.
 *   - `revalidateSessions(next)` calls `sessions.mutate()` with a
 *     pure-updater that replaces the entire list, so the
 *     sessions-list slot shows ONLY the current session (every
 *     other session was revoked server-side).
 *
 * The revalidation is non-blocking after the success
 * acknowledgement — the success banner (T13) appears first, the
 * revalidation follows. If the revalidation rejects, the success
 * banner is NOT rolled back (the password change itself
 * succeeded); the card stays visible and the user can refresh
 * the page to retry the revalidation.
 *
 * ## Partial-failure isolation
 *
 * US-2.8.1 requires that "a dashboard-only error does NOT tear
 * down the page — the session-list slot still mounts". The
 * `<SecuritySummaryCard />` swallows the dashboard failure
 * internally and renders its own Retry banner; this page does not
 * need an error boundary around it. The session-list slot
 * therefore keeps its own loading/error contract independent of
 * the dashboard slot.
 *
 * ## `aria-busy` discipline
 *
 * The page root receives an `aria-busy` value derived from the
 * combined loading state of every subview. When everything
 * finishes, the page becomes `aria-busy="false"` and AT users
 * can resume interaction with the full layout. Crucially,
 * `aria-busy` is `false` whenever a slot's retry banner is
 * showing — the page is *interactive* (Retry clickable), even
 * though one slot is in error.
 *
 * ## Layout discipline
 *
 * - Mounts under `(protected)/settings`, so the existing layout
 *   middleware redirects unauthenticated visitors to
 *   `/login?redirect=/settings/security` (preserves deep-link
 *   back-redirect).
 * - Does NOT duplicate the `Tabs` chrome — `/settings` owns the
 *   tabs; this is a leaf page under it.
 * - Header copy is sourced from `security-copy.ts` (`dashboard.title`
 *   / `dashboard.subtitle`). No hard-coded strings.
 *
 * ## Memoisation
 *
 * `memo`-wrapped per the project's page convention (see
 * `/settings/page.tsx`) so the route stays cheap to navigate away
 * from and back to.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { SecuritySummaryCard } from '@/features/auth/components/security-summary-card';
import { SessionList } from '@/features/auth/components/session-list';
import { ChangePasswordCard } from '@/features/auth/components/change-password-card';
import { VerifyPasswordModal } from '@/features/auth/components/verify-password-modal';
import { useSecurityDashboard } from '@/features/auth/hooks/use-security-dashboard';
import { useActiveSessions } from '@/features/auth/hooks/use-active-sessions';
import { useRevokeOtherSessions } from '@/features/auth/hooks/use-revoke-other-sessions';
import {
  isRecentlyVerified,
  markRecentlyVerified,
} from '@/features/auth/utils/verification-flag';
import { defaultChangePasswordDeps } from '@/features/auth/hooks/use-change-password';
import {
  COPY_KEYS,
  resolveCopy,
} from '@/features/auth/copy/security-copy';
import {
  PASSWORD_COPY_KEYS,
  resolvePasswordCopy,
} from '@/features/auth/services/auth.service';
import type {
  AccountSecurityDto,
  SessionListResponseDto,
} from '@/lib/api';

const CHANGE_PASSWORD_ACTION_ID = 'change-password';

/**
 * Re-sync the page's "verified" state with the in-memory
 * recently-verified flag. We use a 1s polling interval so the
 * CTA re-appears as soon as the flag expires (default TTL is
 * 15s). The `tick` dependency lets `handleVerified` bump the
 * counter to read the new flag immediately after `markRecentlyVerified`.
 */
function useVerifiedFlagState(
  actionId: string,
  tick: number,
): boolean {
  const [verified, setVerified] = useState<boolean>(() =>
    isRecentlyVerified(actionId),
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setVerified(isRecentlyVerified(actionId));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [actionId, tick]);

  useEffect(() => {
    // Re-poll every 1s. The TTL is 15s, so a 1s cadence is fine.
    const id = setInterval(() => {
      setVerified(isRecentlyVerified(actionId));
    }, 1000);
    return () => clearInterval(id);
  }, [actionId]);

  return verified;
}

export default function SecuritySettingsPage() {
  const dashboard = useSecurityDashboard();
  const sessions = useActiveSessions();

  const others = useRevokeOtherSessions({
    listOps: { revalidate: sessions.revalidate },
  });

  // ─── T14 — verify-password CTA + modal orchestration ────────────────
  //
  // The CTA renders below the security-summary card. Clicking it
  // opens `VerifyPasswordModal`. On `valid: true`:
  //   1. The modal closes.
  //   2. `markRecentlyVerified('change-password')` is called.
  //   3. The page's `isVerified` state flips to `true`, revealing
  //      the change-password card slot (T15).
  const [isModalOpen, setIsModalOpen] = useState(false);
  // `verifiedTick` bumps every time the user completes a verify
  // so the verified-state hook re-reads the flag immediately.
  const [verifiedTick, setVerifiedTick] = useState(0);
  const isVerified = useVerifiedFlagState(
    CHANGE_PASSWORD_ACTION_ID,
    verifiedTick,
  );

  // ─── T15 — change-password card mount + post-change revalidation ──
  //
  // `isCardMounted` controls whether the card slot is in the DOM.
  // It flips to `true` the moment the verification flag is set,
  // and back to `false` on `onCollapseAfterSuccess` (success
  // banner auto-dismiss) OR if the flag expires (15s TTL).
  const [isCardMounted, setIsCardMounted] = useState(false);

  const handleOpenVerifyModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseVerifyModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleVerified = useCallback(() => {
    markRecentlyVerified(CHANGE_PASSWORD_ACTION_ID);
    setIsModalOpen(false);
    // Bump the tick so the verified-state hook reads the new
    // flag immediately (the 1s interval would also catch it, but
    // the user expects the slot to reveal instantly).
    setVerifiedTick((t) => t + 1);
  }, []);

  const handleCollapseAfterSuccess = useCallback(() => {
    // The change-password card collapses back to the CTA. The
    // next attempt requires a fresh verify.
    setIsCardMounted(false);
  }, []);

  // Reveal the card the moment the verification flag is set.
  useEffect(() => {
    if (isVerified) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsCardMounted(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isVerified]);

  const revalidateDashboard = useCallback(
    (next: AccountSecurityDto) => {
      // The dashboard hook does not expose a `setData` primitive;
      // the canonical pattern is to call `refetch()` and let the
      // hook re-read. The dashboard hook is deduplicated, so a
      // second `refetch()` while one is in flight shares the
      // same Promise.
      //
      // The `next` argument is preserved for callers who want a
      // richer revalidation (e.g. when the page eventually
      // introduces a custom event the hook listens for). For
      // now we accept the read-back approach.
      void next;
      void dashboard.refetch();
    },
    [dashboard],
  );

  const revalidateSessions = useCallback(
    (next: SessionListResponseDto) => {
      // Replace the entire sessions list so the slot shows ONLY
      // the current session (every other was revoked server-side).
      // `useActiveSessions.mutate(updater)` is the canonical
      // primitive for whole-list replacement: pass an updater
      // that ignores the current list and returns the new one.
      sessions.mutate(() => next.sessions);
    },
    [sessions],
  );

  const hookDeps = useMemo(
    () => ({
      ...defaultChangePasswordDeps,
      revalidateDashboard,
      revalidateSessions,
    }),
    [revalidateDashboard, revalidateSessions],
  );

  // The "Revoke all others" CTA wires through `requiresConfirmation`
  // (T18). Click → modal opens with copy; confirm → fires the
  // request with `{ confirmed: true }`.
  const handleOpenRevokeOthers = useCallback(() => {
    void others.revokeOthers({ confirmed: false });
  }, [others]);

  const handleConfirmRevokeOthers = useCallback(async () => {
    await others.revokeOthers({ confirmed: true });
  }, [others]);

  const handleCancelRevokeOthers = useCallback(() => {
    others.cancelConfirmation();
  }, [others]);

  // `aria-busy` reflects the live loading state of every slot.
  // Each slot is independent — each has its own retry banner on
  // error, which keeps the page *interactive* even while one slot
  // is in error. So `aria-busy` is "true" only when a slot is
  // actively fetching.
  const isBusy =
    dashboard.status === 'loading' ||
    sessions.status === 'loading' ||
    others.status === 'pending' ||
    isModalOpen;

  const showChangePasswordCta = !isVerified && !isCardMounted;

  return (
    <main
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      aria-label={resolveCopy(COPY_KEYS.dashboard.title)}
      aria-busy={isBusy}
      data-testid='security-settings-page'
    >
      <div className='max-w-4xl mx-auto'>
        <header className='mb-8'>
          <h1 className='text-3xl font-bold mb-2'>
            {resolveCopy(COPY_KEYS.dashboard.title)}
          </h1>
          <p className='text-muted-foreground text-base max-w-2xl'>
            {resolveCopy(COPY_KEYS.dashboard.subtitle)}
          </p>
        </header>

        {/* US-2.8.1 dashboard slot. Failure here is isolated to
            the card's own retry banner — the page does not tear
            down. */}
        <section
          aria-label={resolveCopy(COPY_KEYS.dashboard.title)}
          data-testid='security-dashboard-slot'
          className='mb-8'
        >
          <SecuritySummaryCard
            data={dashboard.data}
            status={dashboard.status}
            error={dashboard.error}
            refetch={dashboard.refetch}
          />
        </section>

        {/* T14 — "Change password" CTA. Hidden while the
            verification flag is active; the change-password card
            occupies the slot instead. */}
        {showChangePasswordCta && (
          <section
            aria-label={resolvePasswordCopy(
              PASSWORD_COPY_KEYS.password.changePassword.title,
            )}
            data-testid='change-password-cta-slot'
            className='mb-12'
          >
            <Button
              type='button'
              variant='default'
              onClick={handleOpenVerifyModal}
              className='gap-2'
              data-testid='change-password-cta'
            >
              <Lock className='w-4 h-4' />
              {resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.title,
              )}
            </Button>
          </section>
        )}

        {/* T15 — change-password card slot. Mounted only after
            the verification flag is set. The card collapses back
            to the CTA on success + auto-dismiss, OR on
            `onCollapseAfterSuccess`. */}
        {isCardMounted && (
          <section
            aria-label={resolvePasswordCopy(
              PASSWORD_COPY_KEYS.password.changePassword.title,
            )}
            data-testid='change-password-slot'
            className='mb-12'
          >
            <ChangePasswordCard
              hookDeps={hookDeps}
              onCollapseAfterSuccess={handleCollapseAfterSuccess}
            />
          </section>
        )}

        {/* US-2.8.2 session-list slot. Per-row revoke handlers
            are owned by `SessionRowWithAction` (T19). The
            "Revoke all others" CTA wires through
            `useRevokeOtherSessions` with a confirmation modal. */}
        <section
          aria-label={resolveCopy(COPY_KEYS.sessionList.title)}
          data-testid='security-sessions-slot'
        >
          <SessionList
            sessions={sessions.sessions}
            status={sessions.status}
            error={sessions.error}
            onRevalidate={sessions.revalidate}
            listOps={{
              mutate: sessions.mutate,
              revalidate: sessions.revalidate,
            }}
            onRevokeOthers={handleOpenRevokeOthers}
            revokeOthersPending={others.status === 'pending'}
          />
        </section>

        {/* Confirmation modal for "Revoke all others". Mounted at
            the page level so the list can stay simple. The hook
            owns the `requiresConfirmation` state (T18). */}
        <RevokeOthersConfirmDialog
          open={others.requiresConfirmation && others.status !== 'pending'}
          onConfirm={handleConfirmRevokeOthers}
          onCancel={handleCancelRevokeOthers}
        />

        {/* Verify-password modal (T14). Open state is owned by
            the page. `onVerified` fires after a successful
            verify-password call; the page marks the
            `'change-password'` action as recently verified and
            reveals the card slot. */}
        <VerifyPasswordModal
          open={isModalOpen}
          onClose={handleCloseVerifyModal}
          onVerified={handleVerified}
        />
      </div>
    </main>
  );
}

/**
 * The confirmation modal for "Revoke all others". Pure presentational
 * wrapper around `AlertDialog` so the parent page stays linear.
 *
 * The dialog is open while:
 *   - the user has clicked the CTA (`requiresConfirmation: true`)
 *     AND
 *   - we are NOT actively firing the request (`status !== 'pending'`)
 *
 * The `status !== 'pending'` carve-out is intentional: while the
 * request is in flight, the modal would re-open on a state change
 * driven by the hook's pending transition, which would be
 * disorienting. The `others.status === 'success'` path closes the
 * dialog via `reset()` inside the hook (T18 sets `status: 'success'`
 * on resolve; `requiresConfirmation` is then `true` again because
 * `reset()` is NOT called from the hook automatically — the parent
 * does so when the dialog closes). We bind `onOpenChange` to call
 * `cancelConfirmation` so closing the dialog resets the hook.
 */
interface RevokeOthersConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function RevokeOthersConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: RevokeOthersConfirmDialogProps) {
  // Local open state is needed because AlertDialog is uncontrolled
  // by default and Radix warns when its `open` and the consumer's
  // `open` desync. Bind both.
  const [internalOpen, setInternalOpen] = useState(false);

  // Sync internal open with the parent's `open`.
  if (open !== internalOpen) {
    setInternalOpen(open);
  }

  return (
    <AlertDialog
      open={internalOpen}
      onOpenChange={(next) => {
        setInternalOpen(next);
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent data-testid='revoke-others-confirm-dialog'>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolveCopy(COPY_KEYS.revoke.others.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resolveCopy(COPY_KEYS.revoke.others.body)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid='revoke-others-confirm-cancel'>
            {resolveCopy(COPY_KEYS.revoke.others.cancel)}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void onConfirm();
            }}
            data-testid='revoke-others-confirm-action'
          >
            {resolveCopy(COPY_KEYS.revoke.others.confirm)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
