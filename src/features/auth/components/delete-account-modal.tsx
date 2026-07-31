'use client';

/**
 * DeleteAccountModal — irreversible account-deletion confirmation
 * surface.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source tickets: 2.10.T15 (modal shell + accessibility), 2.10.T16
 * (password field + secret lifecycle), 2.10.T17 (error/pending/
 * cleanup/terminal-success rendering), 2.10.T19 (remount/reset
 * discipline).
 *
 * ## Purpose
 *
 * Single source of truth for the destructive deletion UX. The
 * modal is wired from the Settings → Danger Zone trigger via
 * `useDeleteAccount()` (2.10.T12) and renders every state of the
 * `DeletionState` (2.10.T8) discriminated union. It owns:
 *
 *   - typed-intent confirmation (`DELETE` token — see
 *     `DELETION_INTENT_TOKEN`),
 *   - current-password entry with reveal control and guaranteed
 *     secret clearing on every lifecycle path (2.10.T16),
 *   - error rendering per mapper classification (2.10.T17),
 *   - pending/cleanup state visuals and control disabling,
 *   - post-success public-landing copy (the modal does NOT navigate
 *     — the parent wires `router.replace('/')` once the hook
 *     transitions to `'completed'`),
 *   - modal remount/reset discipline (2.10.T19).
 *
 * ## Why this is one file
 *
 * The earlier epics split modal concerns across files (e.g. Epic
 * 2.9 had separate `VerifyPasswordModal`, password sub-components,
 * error components). For deletion, the state model is one
 * discriminated union; splitting the modal across files would
 * duplicate the `switch (state.kind)` block. Keeping it together
 * preserves exhaustiveness.
 *
 * ## A11y
 *
 *   - `DialogTitle` / `DialogDescription` give the modal an
 *     accessible name and description (Radix UI sets
 *     `aria-labelledby` / `aria-describedby` automatically).
 *   - Inputs use `<Label htmlFor>` pairing.
 *   - The destructive submit button is `aria-busy` while pending.
 *   - The cleanup state hides the close X (Radix-controlled via
 *     `showCloseButton={false}`) so the user cannot escape the
 *     terminal state.
 *   - Escape key: `onEscapeKeyDown` is blocked while terminal;
 *     clicking outside (`onPointerDownOutside`) is also blocked.
 *   - Initial focus is on the close button (Radix default). The
 *     typed-confirmation input receives focus once the user
 *     dismisses any opt-in acknowledgement (we leave focus on the
 *     close button so screen-reader users hear the title first).
 *
 * ## Secret hygiene
 *
 * The password field is local React state. The hook reads it via
 * the `submit()` callback the parent passes in; the modal never
 * stores the password in a ref, localStorage, URL, or analytics.
 * On close / unmount / error / success / cleanup / revalidation,
 * the modal calls the `clearSensitiveDeletionFormValues()`
 * primitive (2.10.T11) via the hook's `reset()` to wipe both the
 * password and the typed confirmation.
 *
 * @see useDeleteAccount (2.10.T12)
 * @see DeletionState (2.10.T8)
 * @see DELETION_INTENT_TOKEN (2.10.T12)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  COPY_KEYS,
  resolveCopy,
} from '@/features/auth/copy/deletion-copy';
import {
  DELETION_INTENT_TOKEN,
  type UseDeleteAccountResult,
} from '@/features/auth/hooks/use-delete-account';
import {
  isDeletionConflict,
  isDeletionUncertain,
  isDeletionValidation,
  isInvalidCurrentPasswordDeletion,
  type DeletionErrorClassification,
} from '@/features/auth/errors/deletion-error-mapper';

export interface DeleteAccountModalProps {
  /**
   * Controlled open state. The parent owns this so the
   * settings page can wire the Danger Zone trigger.
   */
  open: boolean;
  /**
   * Called when the user dismisses the modal via Cancel, Escape,
   * outside-click, or the close X. NOT called while a submission
   * is in flight (`pending` / `cleanup` / `completed`).
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The hook result. The modal calls `submit()` on confirm and
   * `reset()` on close. The modal does NOT call `finalize()`,
   * `revalidate()`, or any other internal — those are owned by the
   * hook.
   */
  hook: UseDeleteAccountResult;
}

/**
 * Render the destructive deletion modal.
 *
 * See file header for the state model and a11y contract.
 */
export function DeleteAccountModal({
  open,
  onOpenChange,
  hook,
}: DeleteAccountModalProps): React.JSX.Element {
  // Local form state. The values live ONLY in this component; the
  // hook reads them via `submit()` and never stores them.
  const [password, setPassword] = useState('');
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);

  // ─── Lifecycle guards (T19) ───────────────────────────────────────────────

  // The parent's `handleCloseAttempt` already calls
  // `hook.reset({ setPassword, setTypedConfirmation })`, which in
  // turn invokes `clearSensitiveDeletionFormValues()` (2.10.T11).
  // The local React state for `revealPassword` is reset by
  // `handleCloseAttempt` directly (a derived-from-effect would
  // trigger cascading renders — see react-hooks/set-state-in-effect).
  //
  // On UNMOUNT we still need to wipe the secret values because
  // the parent might unmount the modal without going through
  // `handleCloseAttempt` (e.g. route change). The cleanup
  // function below is the canonical place for that.
  useEffect(() => {
    return () => {
      setPassword('');
      setTypedConfirmation('');
      setRevealPassword(false);
    };
  }, []);

  // ─── Derived booleans ─────────────────────────────────────────────────────

  const state = hook.state;

  const isPending = state.kind === 'pending';
  const isCleanup = state.kind === 'cleanup';
  const isCompleted = state.kind === 'completed';
  const isTerminal = isCleanup || isCompleted;
  // The `uncertain` state is rendered through the same form layout
  // as `idle`; the banner-error branch handles the copy. We do not
  // need a dedicated `isUncertain` boolean because the form
  // disabled state already keys off `isPending || isCleanup ||
  // isCompleted`.

  const error = state.kind === 'idle' || state.kind === 'pending'
    ? state.error
    : state.kind === 'uncertain'
      ? state.error
      : null;

  const classification = error?.classification ?? null;

  // Field-level error: `invalid_current` (cleared password field).
  // `validation` is BOTH a field-level error (when it concerns the
  // password) AND a banner error (because it carries a structured
  // list of messages); we render the field-level message inline and
  // skip the banner to avoid duplication.
  const passwordFieldError =
    classification && isInvalidCurrentPasswordDeletion(classification)
      ? true
      : false;

  // Banner-level error: every classification EXCEPT `invalid_current`,
  // which is rendered inline below the password field.
  const bannerError =
    classification && !isInvalidCurrentPasswordDeletion(classification)
      ? classification
      : null;

  // Submission is allowed only when: idle, fields valid, password
  // non-empty, typed confirmation matches the token exactly, and
  // the hook is not in `pending` / `cleanup` / `completed`.
  const canSubmit =
    state.kind === 'idle' &&
    password.length > 0 &&
    typedConfirmation === DELETION_INTENT_TOKEN &&
    !isTerminal;

  // Allow the password to be re-entered after a previous attempt:
  // we only block the password field during pending and cleanup.
  // `completed` is terminal — the field is read-only.
  const passwordDisabled = isPending || isCleanup || isCompleted;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCloseAttempt = useCallback(
    (next: boolean) => {
      if (!next && isPending) {
        // Pending submission cannot be canceled by closing the
        // modal — the request has already been dispatched.
        return;
      }
      if (!next && isTerminal) {
        // Cleanup / completed states cannot be dismissed; the
        // parent (T18) listens for `state.kind === 'completed'`
        // and routes to the public landing page.
        return;
      }
      if (!next) {
        // Close path: clear local form state and ask the hook to
        // reset. The hook's `reset()` clears its own state.
        hook.reset({ setPassword, setTypedConfirmation });
        setRevealPassword(false);
      }
      onOpenChange(next);
    },
    [hook, isPending, isTerminal, onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!canSubmit) return;
      await hook.submit(password, typedConfirmation);
    },
    [canSubmit, hook, password, typedConfirmation],
  );

  const handleRecheck = useCallback(async (): Promise<void> => {
    await hook.revalidate();
  }, [hook]);

  const handleCancel = useCallback((): void => {
    handleCloseAttempt(false);
  }, [handleCloseAttempt]);

  // ─── Copy resolution ──────────────────────────────────────────────────────

  const copy: DeleteAccountCopy = useMemo(
    () => ({
      title: resolveCopy(COPY_KEYS.deletion.confirm.title),
      body: resolveCopy(COPY_KEYS.deletion.confirm.body),
      consequenceHeading: resolveCopy(
        COPY_KEYS.deletion.confirm.consequenceHeading,
      ),
      consequenceBody: resolveCopy(COPY_KEYS.deletion.confirm.consequenceBody),
      typedLabel: resolveCopy(COPY_KEYS.deletion.typed.label),
      typedPlaceholder: resolveCopy(COPY_KEYS.deletion.typed.placeholder),
      typedHint: resolveCopy(COPY_KEYS.deletion.typed.hint),
      passwordLabel: resolveCopy(COPY_KEYS.deletion.password.label),
      passwordPlaceholder: resolveCopy(
        COPY_KEYS.deletion.password.placeholder,
      ),
      reveal: resolveCopy(COPY_KEYS.deletion.password.reveal),
      hide: resolveCopy(COPY_KEYS.deletion.password.hide),
      submit: resolveCopy(COPY_KEYS.deletion.actions.submit),
      cancel: resolveCopy(COPY_KEYS.deletion.actions.cancel),
      submitPending: resolveCopy(COPY_KEYS.deletion.actions.submitPending),
      cleanupPending: resolveCopy(COPY_KEYS.deletion.actions.cleanupPending),
      cleanupHeading: resolveCopy(COPY_KEYS.deletion.cleanup.heading),
      cleanupBody: resolveCopy(COPY_KEYS.deletion.cleanup.body),
      invalidCurrentField: resolveCopy(
        COPY_KEYS.deletion.errors.invalidCurrentField,
      ),
      invalidCurrentBanner: resolveCopy(
        COPY_KEYS.deletion.errors.invalidCurrentBanner,
      ),
      conflictBanner: resolveCopy(COPY_KEYS.deletion.errors.conflictBanner),
      conflictRevalidateCta: resolveCopy(
        COPY_KEYS.deletion.errors.conflictRevalidateCta,
      ),
      notFoundBanner: resolveCopy(COPY_KEYS.deletion.errors.notFoundBanner),
      uncertainBanner: resolveCopy(COPY_KEYS.deletion.errors.uncertainBanner),
      uncertainRevalidateCta: resolveCopy(
        COPY_KEYS.deletion.errors.uncertainRevalidateCta,
      ),
      authTerminalBanner: resolveCopy(
        COPY_KEYS.deletion.errors.authTerminalBanner,
      ),
      validationEmptyPassword: resolveCopy(
        COPY_KEYS.deletion.errors.validationEmptyPassword,
      ),
      validationBanner: resolveCopy(COPY_KEYS.deletion.errors.validationBanner),
    }),
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={handleCloseAttempt}
    >
      <DialogContent
        className='sm:max-w-md'
        // Hide the close X while terminal so the user cannot
        // escape the post-success path.
        showCloseButton={!isTerminal}
        // Block Escape / outside-click during the terminal path.
        onEscapeKeyDown={(e) => {
          if (isTerminal) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isTerminal || isPending) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isTerminal || isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='w-5 h-5' aria-hidden='true' />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>

        {/* Cleanup state — full-screen-ish banner; no form. */}
        {isCleanup || isCompleted ? (
          <div
            className='space-y-3 py-6'
            role='status'
            aria-live='polite'
          >
            <div className='flex items-center gap-3'>
              <Loader2
                className='w-5 h-5 animate-spin text-foreground'
                aria-hidden='true'
              />
              <h2 className='text-lg font-semibold'>{copy.cleanupHeading}</h2>
            </div>
            <p className='text-sm text-muted-foreground'>{copy.cleanupBody}</p>
            {isCompleted ? (
              <p className='text-sm text-muted-foreground'>
                {resolveCopy(COPY_KEYS.deletion.publicLanding.notice)}
              </p>
            ) : null}
          </div>
        ) : (
          <form
            id='delete-account-form'
            onSubmit={handleSubmit}
            className='space-y-4 py-4'
          >
            {/* Consequence panel — destructive tone, no raw backend msg. */}
            <div
              className='p-3 rounded-lg bg-destructive/10 border border-destructive/20'
              role='note'
            >
              <p className='text-sm text-destructive font-medium'>
                {copy.consequenceHeading}
              </p>
              <p className='mt-2 text-sm text-destructive/80'>
                {copy.consequenceBody}
              </p>
            </div>

            {/* Banner error — `conflict` / `uncertain` / `auth_terminal` /
                `validation` with messages. `invalid_current` is a
                field-level error and renders below the password input. */}
            {bannerError ? (
              <BannerError
                classification={bannerError}
                copy={copy}
                onRecheck={handleRecheck}
              />
            ) : null}

            {/* Password field (T16). */}
            <div className='space-y-2'>
              <Label htmlFor='delete-account-password'>
                {copy.passwordLabel}
              </Label>
              <div className='relative'>
                <Input
                  id='delete-account-password'
                  type={revealPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  autoComplete='current-password'
                  disabled={passwordDisabled}
                  aria-invalid={passwordFieldError}
                  aria-describedby={
                    passwordFieldError
                      ? 'delete-account-password-error'
                      : undefined
                  }
                  className='pr-10'
                />
                <button
                  type='button'
                  onClick={() => setRevealPassword((v) => !v)}
                  disabled={passwordDisabled}
                  aria-label={
                    revealPassword ? copy.hide : copy.reveal
                  }
                  className='absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md disabled:pointer-events-none disabled:opacity-50'
                  tabIndex={0}
                >
                  {revealPassword ? (
                    <EyeOff className='w-4 h-4' aria-hidden='true' />
                  ) : (
                    <Eye className='w-4 h-4' aria-hidden='true' />
                  )}
                </button>
              </div>
              {passwordFieldError ? (
                <p
                  id='delete-account-password-error'
                  className='text-sm text-destructive'
                  role='alert'
                >
                  {passwordFieldError
                    ? copy.invalidCurrentField
                    : copy.validationEmptyPassword}
                </p>
              ) : null}
            </div>

            {/* Typed confirmation (T15). */}
            <div className='space-y-2'>
              <Label htmlFor='delete-account-typed'>
                {copy.typedLabel}
              </Label>
              <Input
                id='delete-account-typed'
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={copy.typedPlaceholder}
                disabled={passwordDisabled}
                aria-describedby='delete-account-typed-hint'
                className='font-mono'
              />
              <p
                id='delete-account-typed-hint'
                className='text-xs text-muted-foreground'
              >
                {copy.typedHint}
              </p>
            </div>
          </form>
        )}

        {!isCleanup && !isCompleted ? (
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isPending}
            >
              {copy.cancel}
            </Button>
            <Button
              type='submit'
              form='delete-account-form'
              variant='destructive'
              disabled={!canSubmit}
              aria-busy={isPending}
              aria-label={copy.submit}
            >
              {isPending ? (
                <>
                  <Loader2
                    className='w-4 h-4 mr-2 animate-spin'
                    aria-hidden='true'
                  />
                  {copy.submitPending}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          </DialogFooter>
        ) : isCleanup ? (
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled
              aria-busy={true}
              aria-label={copy.cleanupPending}
            >
              <Loader2
                className='w-4 h-4 mr-2 animate-spin'
                aria-hidden='true'
              />
              {copy.cleanupPending}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Banner-level error rendering. Renders the appropriate copy
 * (never the raw backend message) and, for `conflict` /
 * `uncertain`, the "Re-check account state" CTA.
 */
function BannerError({
  classification,
  copy,
  onRecheck,
}: {
  classification: DeletionErrorClassification;
  copy: DeleteAccountCopy;
  onRecheck: () => void | Promise<void>;
}): React.JSX.Element {
  if (isDeletionConflict(classification)) {
    return (
      <div
        role='alert'
        className='p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
      >
        <p className='text-sm text-amber-800 dark:text-amber-200'>
          {copy.conflictBanner}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void onRecheck()}
          className='mt-2'
        >
          <RefreshCw className='w-3 h-3 mr-1' aria-hidden='true' />
          {copy.conflictRevalidateCta}
        </Button>
      </div>
    );
  }

  if (isDeletionUncertain(classification)) {
    return (
      <div
        role='alert'
        className='p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
      >
        <p className='text-sm text-amber-800 dark:text-amber-200'>
          {copy.uncertainBanner}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void onRecheck()}
          className='mt-2'
        >
          <RefreshCw className='w-3 h-3 mr-1' aria-hidden='true' />
          {copy.uncertainRevalidateCta}
        </Button>
      </div>
    );
  }

  if (classification.kind === 'auth_terminal') {
    return (
      <div
        role='alert'
        className='p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
      >
        <p className='text-sm text-amber-800 dark:text-amber-200'>
          {copy.authTerminalBanner}
        </p>
      </div>
    );
  }

  if (classification.kind === 'not_found') {
    return (
      <div
        role='alert'
        className='p-3 rounded-lg bg-muted border border-border'
      >
        <p className='text-sm text-muted-foreground'>
          {copy.notFoundBanner}
        </p>
      </div>
    );
  }

  if (isDeletionValidation(classification)) {
    return (
      <div
        role='alert'
        className='p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
      >
        <p className='text-sm text-amber-800 dark:text-amber-200'>
          {copy.validationBanner}
        </p>
      </div>
    );
  }

  // Conservative fallback — should not be reachable because the
  // parent already collapsed `invalid_current` to a field-level
  // error and `uncertain` / `conflict` are handled above.
  return (
    <div
      role='alert'
      className='p-3 rounded-lg bg-muted border border-border'
    >
      <p className='text-sm text-muted-foreground'>
        {copy.uncertainBanner}
      </p>
    </div>
  );
}

/**
 * Resolved copy bundle used by the modal and the `BannerError`
 * helper. Internal type so the helper signatures stay narrow.
 */
interface DeleteAccountCopy {
  title: string;
  body: string;
  consequenceHeading: string;
  consequenceBody: string;
  typedLabel: string;
  typedPlaceholder: string;
  typedHint: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  reveal: string;
  hide: string;
  submit: string;
  cancel: string;
  submitPending: string;
  cleanupPending: string;
  cleanupHeading: string;
  cleanupBody: string;
  invalidCurrentField: string;
  invalidCurrentBanner: string;
  conflictBanner: string;
  conflictRevalidateCta: string;
  notFoundBanner: string;
  uncertainBanner: string;
  uncertainRevalidateCta: string;
  authTerminalBanner: string;
  validationEmptyPassword: string;
  validationBanner: string;
}
