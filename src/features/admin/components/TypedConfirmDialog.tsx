'use client';

import type { ReactNode } from 'react';
import React from 'react';

/**
 * `features/admin/components/TypedConfirmDialog.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C5.
 *
 * Modal primitive that requires the user to type a documented confirm
 * string exactly (case-sensitive, whitespace-sensitive) before the
 * destructive action is enabled. This is the canonical typed-confirm
 * surface for every irreversible Phase 7 action.
 *
 * Invariants:
 *
 *   - The confirm button is disabled until the typed value matches
 *     `getIrreversibleConfirmString(operation)` exactly. Mismatches
 *     (case or whitespace) keep the button disabled.
 *   - The dialog surfaces a `RequestIdBanner` if `previousError` is
 *     supplied, so the admin can copy the request id for support
 *     tickets.
 *   - When `pending === true`, both the confirm and cancel buttons
 *     are disabled so the dialog cannot be dismissed mid-mutation.
 *   - The dialog calls `onConfirm` exactly once when the confirm
 *     button is clicked while enabled.
 *   - The dialog calls `onCancel` and never calls `onConfirm` when
 *     cancelled (ESC, cancel button, or backdrop).
 *
 * The dialog is built on the existing `AlertDialog` primitive so the
 * focus trap and restore-focus behaviour match the rest of the app.
 */

import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ApiError } from '@/lib/api/core/ApiError';

import {
  getIrreversibleConfirmString,
  type IrreversibleAdminOperation,
} from '../admin-capabilities';
import { RequestIdBanner } from './RequestIdBanner';

export interface TypedConfirmDialogProps {
  open: boolean;
  operation: IrreversibleAdminOperation;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  pending?: boolean;
  previousError?: ApiError | null;
  /**
   * Optional override of the expected confirm string. Defaults to the
   * canonical string from `IRREVERSIBLE_OPERATIONS`. Exposed for tests
   * and for surface-specific overrides (none today).
   */
  expectedConfirmString?: string;
  /**
   * Optional content rendered between the dialog header and the typed-confirm
   * form. Used by `TournamentDeleteDialog` (TKT-7.7.D4) to render the
   * cascade notice above the confirm input.
   */
  children?: React.ReactNode;
}

export function TypedConfirmDialog({
  open,
  operation,
  onConfirm,
  onCancel,
  pending = false,
  previousError = null,
  expectedConfirmString,
  children,
}: TypedConfirmDialogProps) {
  const [input, setInput] = useState('');
  const inputId = useId();

  const requiredString = useMemo(() => {
    return expectedConfirmString ?? getIrreversibleConfirmString(operation);
  }, [expectedConfirmString, operation]);

  // Exact match (case-sensitive, whitespace-sensitive). The string
  // compare uses strict equality on the raw input — the comparison is
  // byte-identical to the server's check.
  const matches = input === requiredString;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matches || pending) return;
    void onConfirm();
    // We deliberately leave `input` populated for visual confirmation
    // until the parent closes the dialog. The parent re-renders with
    // `open={false}` after the mutation settles (success or failure).
  };

  const handleCancel = () => {
    if (pending) return;
    setInput('');
    onCancel();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleCancel();
      }}
    >
      <AlertDialogContent
        data-testid="typed-confirm-dialog-content"
        data-operation={operation}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm irreversible action</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. To proceed, type the
            confirmation phrase exactly as shown.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {previousError ? <RequestIdBanner error={previousError} /> : null}

        {children !== undefined ? (
          <div data-testid="typed-confirm-dialog-children">{children}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>Confirmation phrase</Label>
            <code
              data-testid="typed-confirm-dialog-required-string"
              className="rounded bg-muted px-2 py-1 text-sm font-mono"
            >
              {requiredString ?? ''}
            </code>
            <Input
              id={inputId}
              name="typed-confirm"
              autoComplete="off"
              spellCheck={false}
              data-testid="typed-confirm-dialog-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={pending}
              aria-invalid={input.length > 0 && !matches ? 'true' : 'false'}
              aria-describedby={`${inputId}-hint`}
              placeholder="Type the confirmation phrase"
            />
            <p
              id={`${inputId}-hint`}
              className="text-xs text-muted-foreground"
            >
              Match is case-sensitive and whitespace-sensitive.
            </p>
          </div>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              type="button"
              disabled={pending}
              data-testid="typed-confirm-dialog-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              disabled={!matches || pending}
              data-testid="typed-confirm-dialog-confirm"
              aria-disabled={!matches || pending}
            >
              {pending ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
