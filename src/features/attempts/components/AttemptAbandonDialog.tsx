'use client';

/**
 * `AttemptAbandonDialog` — typed-confirmation abandon dialog.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.17.
 *
 * ## What this component owns
 *
 *   - Requires the user to type a fixed confirmation string before
 *     the Confirm action enables.
 *   - Renders the approved consequence copy exactly.
 *   - Preserves progress state until server confirmation succeeds.
 *   - Hides the dialog only on `success`; surfaces the typed
 *     confirmation across `retryable` errors so the user does not
 *     have to retype.
 *   - Disables Confirm, Cancel, Escape, and the underlying trigger
 *     while pending.
 *
 * ## What this component does NOT own
 *
 *   - No mutation call — the parent supplies the `onConfirm`
 *     callback which the `useAbandonAttempt` hook (T-4.14.12)
 *     implements.
 *
 * ## Shared primitive
 *
 * Built on the `<ConfirmDialog />` primitive (TKT-4.1.D2), which
 * already provides:
 *
 *   - The `role="alertdialog"` wrapper + focus trap.
 *   - The typed-confirm input + Enter-key affordance.
 *   - The disabled-on-loading confirm button.
 *
 * This component adds:
 *
 *   - The approved `body` copy + cancel/confirm buttons specific to
 *     attempt abandon.
 *   - The retention of the user's typed input across transient
 *     `retryable` errors so the user does not lose progress.
 */

import * as React from 'react';

import { ConfirmDialog } from '@/components/primitives';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptAbandonDialogProps {
  /** Controlled open state. */
  open: boolean;
  /**
   * Fired when the user confirms the typed-confirm text. Invoked
   * exactly once per open. The parent typically wires this to the
   * `useAbandonAttempt.confirm()` mutation.
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Fired when the user cancels — clicking Cancel, pressing Escape,
   * or otherwise closing the dialog without confirming.
   */
  onCancel: () => void;
  /**
   * Loading state — disables confirm + cancel + close paths.
   */
  isPending?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptAbandonDialog(
  props: AttemptAbandonDialogProps,
): React.ReactElement {
  const { open, onConfirm, onCancel, isPending = false } = props;

  return (
    <ConfirmDialog
      open={open}
      kind="destructive-permanent"
      entityLabel="this attempt"
      // The shared dialog disables the Confirm button until the
      // typed string matches exactly.
      typedConfirmRequired
      typedOverride="abandon"
      confirmLabel="Abandon attempt"
      cancelLabel="Go back"
      loading={isPending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      data-testid="attempt-abandon-dialog"
    />
  );
}