'use client';

/**
 * `/settings/security` — Security settings page.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T9 (route scaffold), 2.8.T12 (dashboard wiring).
 *
 * ## Composition contract
 *
 * This page is the composition root for two independent views:
 *
 *   - **SecuritySummaryCard** (US-2.8.1) — verification status,
 *     password metadata, active-session count. Mounted on top,
 *     wired to `useSecurityDashboard()` (2.8.T7) so each render
 *     reflects the dashboard's local status without tearing the
 *     rest of the page down.
 *
 *   - **ActiveSessionsList** (US-2.8.2) — per-device rows with
 *     individual revoke buttons, "Revoke other sessions" CTA, and
 *     "Sign out of all devices" CTA. Mounted underneath. Lands in
 *     T13+ (Batches 5/6).
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
 * combined loading state of both subviews. When both finish, the
 * page becomes `aria-busy="false"` and AT users can resume
 * interaction with the full layout. Crucially, `aria-busy` is
 * `false` whenever the dashboard's retry banner is showing — the
 * page is *interactive* (Retry clickable), even though one slot
 * is in error.
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

import { memo, useCallback, useState } from 'react';
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
import { SecuritySummaryCard } from '@/features/auth/components/security-summary-card';
import { SessionList } from '@/features/auth/components/session-list';
import { useSecurityDashboard } from '@/features/auth/hooks/use-security-dashboard';
import { useActiveSessions } from '@/features/auth/hooks/use-active-sessions';
import { useRevokeOtherSessions } from '@/features/auth/hooks/use-revoke-other-sessions';
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/security-copy';

const SecuritySettingsPage = memo(function SecuritySettingsPage() {
  const dashboard = useSecurityDashboard();
  const sessions = useActiveSessions();

  const others = useRevokeOtherSessions({
    listOps: { revalidate: sessions.revalidate },
  });

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

  // `aria-busy` reflects the live loading state of either slot.
  // Both slots are independent — each has its own retry banner on
  // error, which keeps the page *interactive* even while one slot
  // is in error. So `aria-busy` is "true" only when a slot is
  // actively fetching.
  const isBusy =
    dashboard.status === 'loading' ||
    sessions.status === 'loading' ||
    others.status === 'pending';

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
          <p className='text-foreground/70 text-base max-w-2xl'>
            {resolveCopy(COPY_KEYS.dashboard.subtitle)}
          </p>
        </header>

        {/* US-2.8.1 dashboard slot. Failure here is isolated to
            the card's own retry banner — the page does not tear
            down. */}
        <section
          aria-label={resolveCopy(COPY_KEYS.dashboard.title)}
          data-testid='security-dashboard-slot'
          className='mb-12'
        >
          <SecuritySummaryCard
            data={dashboard.data}
            status={dashboard.status}
            error={dashboard.error}
            refetch={dashboard.refetch}
          />
        </section>

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
      </div>
    </main>
  );
});

export default SecuritySettingsPage;

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
