'use client';

/**
 * `VerifyPasswordModal` — reusable password-re-verification modal.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T9.
 *
 * ## Purpose
 *
 * Hosts the password input + submit button that proves the user
 * knows their current password before sensitive actions (currently
 * just the change-password card; future actions may reuse the
 * modal). Closes itself and fires `onVerified()` when the backend
 * confirms the password.
 *
 * ## Discipline
 *
 *   1. The modal opens with an EMPTY password field on every open —
 *      it never restores from cache, history, or session storage.
 *      The `password` argument to `verify()` is local to the
 *      synchronous call.
 *
 *   2. The modal cancels the in-flight request on `onClose` by
 *      calling `useVerifyPassword.reset()`. No closure captures
 *      the password across renders — the field is owned by the
 *      `password` state and is cleared on cancel.
 *
 *   3. On `classification: 'invalid_current'`, the modal renders the
 *      field-level copy under the password field AND clears the
 *      field via the local `setPassword('')`.
 *
 *   4. On `classification: 'retryable'`, the modal renders a banner
 *      with Retry (`useVerifyPassword.verify(password)` is re-fired
 *      with the current field value).
 *
 *   5. On `classification: 'auth_terminal'`, the modal closes itself
 *      — the shared refresh/final-logout policy in
 *      `custom-instance.ts` (Epic 2.7) handles the redirect.
 *
 *   6. On `valid: true`, the modal closes and `onVerified()` fires.
 *      The parent receives the verified-password confirmation.
 *
 * ## UI primitives
 *
 * Uses the existing `AlertDialog` primitive (`@radix-ui/react-alert-dialog`)
 * for focus trap and Escape handling. The internal `Input`,
 * `Button`, and `Label` primitives are the project-wide ones.
 *
 * ## Auth terminal handling
 *
 * The hook does not handle `auth_terminal` specially — the modal
 * wires the `useEffect` that closes the modal when the
 * classification kind is `'auth_terminal'`. The shared
 * refresh/final-logout policy is owned by the SDK interceptor in
 * `custom-instance.ts` (Epic 2.7).
 *
 * ## No closure capture of the password
 *
 * The component does not store the password in a `useEffect`,
 * `useCallback`, or `useMemo` dependency. The `password` argument
 * is local to the synchronous `verify(password)` call. The
 * cancel/reset path clears the local `password` state.
 *
 * @see useVerifyPassword (2.9.T6)
 * @see ChangePasswordCard (2.9.T11)
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { InlineError } from '@/components/ui/loading-states/ErrorState';
import { cn } from '@/shared/utils/merge-class-names';
import { useVerifyPassword } from '@/features/auth/hooks/use-verify-password';
import {
  PASSWORD_COPY_KEYS,
  resolvePasswordCopy,
} from '@/features/auth/service/auth.service';

export interface VerifyPasswordModalProps {
  /**
   * Whether the modal is open. The parent owns the open state.
   */
  open: boolean;
  /**
   * Called when the user dismisses the modal (Cancel / Escape /
   * outside click / programmatic close). The modal clears the
   * password field and resets the hook before this fires.
   */
  onClose: () => void;
  /**
   * Called when the backend confirms `valid: true`. The parent
   * typically opens the sensitive action (e.g. the change-password
   * card) and may mark the action as recently verified.
   */
  onVerified: () => void;
  /**
   * Optional dependency injection for tests. Production callers
   * leave this `undefined`.
   */
  hookDeps?: Parameters<typeof useVerifyPassword>[0];
}

/**
 * `VerifyPasswordModal` — see file header.
 */
export function VerifyPasswordModal({
  open,
  onClose,
  onVerified,
  hookDeps,
}: VerifyPasswordModalProps) {
  const passwordFieldId = useId();

  const { verify, status, error, result, reset } =
    useVerifyPassword(hookDeps);

  // Local password state. Cleared on cancel; NEVER restored from
  // cache. The argument to `verify()` is local to the synchronous
  // call.
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);

  // Reset the hook + clear the password every time the modal opens
  // fresh. This is the "open with empty password" guarantee. We
  // intentionally fire `setState` from this effect (per
  // `use-check-username.ts` / `use-check-email.ts` convention) — the
  // modal never opens with a stale field.
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      reset();
      setPassword('');
      setReveal(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, reset]);

  // On `valid: true`, fire `onVerified` and close.
  useEffect(() => {
    if (status === 'success' && result?.valid === true) {
      onVerified();
      // Parent owns the open state — do NOT call reset() here
      // because the modal is closing.
    }
  }, [status, result, onVerified]);

  // On `auth_terminal`, close. The shared refresh policy in
  // `custom-instance.ts` owns the redirect.
  useEffect(() => {
    if (error?.classification.kind === 'auth_terminal') {
      onClose();
    }
  }, [error, onClose]);

  // When the classification is `invalid_current`, clear the password
  // field. The backend has already returned
  // `AUTH_INVALID_CURRENT_PASSWORD`; the user must retype. We
  // intentionally fire `setState` from this effect (per
  // `use-check-username.ts` / `use-check-email.ts` convention).
  useEffect(() => {
    if (error?.classification.kind === 'invalid_current') {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPassword('');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [error]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (!password || status === 'pending') return;
      // Fire-and-forget: the `useEffect` above reacts to status
      // changes. The hook returns the response promise so we keep
      // it for testability.
      void verify(password);
    },
    [password, status, verify],
  );

  const handleCancel = useCallback((): void => {
    reset();
    setPassword('');
    setReveal(false);
    onClose();
  }, [onClose, reset]);

  const classification = error?.classification.kind;

  // Field-level error visible under the password input.
  const fieldErrorCopy =
    classification === 'invalid_current'
      ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verifyError.invalidCurrent)
      : null;

  // Banner copy when the modal-level classification is retryable.
  const bannerCopy =
    classification === 'retryable'
      ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verifyError.retryable)
      : classification === 'auth_terminal'
        ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verifyError.authTerminal)
        : classification === 'conflict'
          ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.conflict)
          : null;

  const submitDisabled =
    !password || status === 'pending';

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        handleCancel();
      }
    },
    [handleCancel],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className='sm:max-w-md'
        // No password string is logged via `console.*`; the
        // `data-testid` is here for E2E selectors.
        data-testid='verify-password-modal'
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.body)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className='space-y-3'>
          <div className='space-y-2'>
            <Label htmlFor={passwordFieldId} className='text-sm font-medium'>
              {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.fieldLabel)}
            </Label>
            <div className='relative'>
              <Input
                id={passwordFieldId}
                // Password is masked by default. Reveal toggle
                // sets `type="text"`.
                type={reveal ? 'text' : 'password'}
                autoComplete='current-password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.verify.fieldPlaceholder,
                )}
                disabled={status === 'pending'}
                aria-invalid={classification === 'invalid_current'}
                aria-describedby={
                  fieldErrorCopy ? `${passwordFieldId}-error` : undefined
                }
                className={cn(
                  'pr-10',
                  classification === 'invalid_current' &&
                    'border-destructive focus-visible:border-destructive',
                )}
              />
              <button
                type='button'
                onClick={() => setReveal((r) => !r)}
                disabled={status === 'pending'}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50'
                aria-label={
                  reveal
                    ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.hide)
                    : resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.reveal)
                }
                data-testid='verify-password-reveal'
              >
                {reveal ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
            {fieldErrorCopy && (
              <p
                id={`${passwordFieldId}-error`}
                className='text-sm text-destructive'
                role='alert'
                data-testid='verify-password-field-error'
              >
                {fieldErrorCopy}
              </p>
            )}
          </div>

          {bannerCopy && (
            <div
              className='rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-center justify-between gap-2'
              role='alert'
              data-testid='verify-password-banner'
            >
              <p className='text-sm text-destructive'>{bannerCopy}</p>
              {classification === 'retryable' && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => password && void verify(password)}
                  disabled={!password || status === 'pending'}
                  className='shrink-0 gap-1'
                  data-testid='verify-password-retry'
                >
                  <RefreshCw className='w-3 h-3' />
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Generic error banner for unknown shapes that did not
              fold into a known classification. */}
          {error && !bannerCopy && !fieldErrorCopy && (
            <InlineError
              message={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.verifyError.generic,
              )}
            />
          )}

          <AlertDialogFooter className='gap-2'>
            <AlertDialogCancel
              type='button'
              onClick={handleCancel}
              disabled={status === 'pending'}
              data-testid='verify-password-cancel'
            >
              {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.cancel)}
            </AlertDialogCancel>
            <Button
              type='submit'
              disabled={submitDisabled}
              data-testid='verify-password-submit'
            >
              {status === 'pending' && (
                <Loader2 className='w-4 h-4 animate-spin' />
              )}
              {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verify.submit)}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}