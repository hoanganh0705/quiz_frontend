'use client';

/**
 * <ConfirmDialog /> — Phase 4 destructive-action primitive.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.D2.
 *
 * ## Purpose
 *
 * Phase 4 ships many irreversible / state-changing actions:
 * hard-delete a bookmark collection (4.6), bulk-remove bookmarks
 * (4.7), delete a review (4.13), submit-and-complete an attempt
 * (4.15), etc. Each of those surfaces a confirmation dialog before
 * the side-effecting mutation runs. This primitive is the single
 * place those confirmations live — same vocabulary, same a11y,
 * same typed-confirm variant, same focus trap.
 *
 * The dialog's text content comes from `CONFIRM_COPY[kind]`
 * (TKT-4.1.D1). The 5 variants — `destructive-permanent`,
 * `destructive-idempotent`, `state-changing`, `irreversible-flow`,
 * `typed-confirm` — exhaustively cover the destructive surfaces
 * Phase 4 introduces.
 *
 * ## Composition
 *
 * Built on the existing `AlertDialog*` primitives under
 * `src/components/ui/AlertDialog.tsx`. Radix's AlertDialog provides:
 *
 *   - `role="alertdialog"` on the content (matches WCAG 4.1.3
 *     status messages)
 *   - focus trap while open
 *   - restore-focus on close (returns focus to the previously
 *     focused element)
 *   - ESC to cancel
 *   - portal rendering (not inline in the React tree)
 *
 * This primitive adds on top of those guarantees:
 *
 *   - the typed-confirm text input (disabled-until-match)
 *   - the Enter-key-to-confirm affordance when typed-confirm is
 *     satisfied
 *   - the `<AlertDialogAction>` click handler wired to `onConfirm`
 *
 * ## Props
 *
 *   - `open`            — controlled open state (parent owns it)
 *   - `kind`            — `ConfirmKind` selecting the copy table row
 *   - `entityLabel?`    — optional noun interpolated into the body
 *                         (e.g. "My bookmarks"). Defaults to a generic
 *                         placeholder via the vocabulary.
 *   - `typedConfirmRequired?` — when `true`, the confirm button is
 *                         disabled until the user types the dialog's
 *                         `typedString`. Defaults to `false`.
 *   - `typedOverride?`  — optional override of the variant's
 *                         `typedString` (e.g. consumer wants the user
 *                         to type the entity name). When set,
 *                         `typedConfirmRequired` is implicitly `true`.
 *   - `onConfirm`       — fired when the user clicks confirm (or
 *                         presses Enter on a satisfied typed-confirm)
 *   - `onCancel`        — fired when the user clicks cancel, presses
 *                         ESC, or otherwise closes the dialog without
 *                         confirming
 *   - `confirmLabel?` / `cancelLabel?` — optional override of the
 *                         vocabulary's labels (rare)
 *   - `loading`         — when `true`, the confirm button shows a
 *                         spinner and is disabled (used by services
 *                         that await an API response)
 *
 * ## Examples
 *
 *   ```tsx
 *   <ConfirmDialog
 *     open={showDelete}
 *     kind="destructive-permanent"
 *     entityLabel={collection.name}
 *     onConfirm={async () => { await delete.mutateAsync(); setShowDelete(false); }}
 *     onCancel={() => setShowDelete(false)}
 *     loading={delete.isPending}
 *   />
 *   ```
 *
 *   ```tsx
 *   <ConfirmDialog
 *     open={submitStep !== null}
 *     kind="typed-confirm"
 *     typedOverride={quiz.title}
 *     entityLabel={quiz.title}
 *     onConfirm={onSubmit}
 *     onCancel={onAbort}
 *   />
 *   ```
 */
import * as React from 'react';

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
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
  CONFIRM_COPY,
  type ConfirmCopy,
  type ConfirmKind,
} from './confirm-copy';

/**
 * Props for the `<ConfirmDialog />` primitive.
 */
export type ConfirmDialogProps = {
  /** Controlled open state. Parent owns it. */
  open: boolean;
  /** Which variant's copy to render. */
  kind: ConfirmKind;
  /**
   * Optional noun to interpolate into the copy. Most variants
   * substitute the body `<entity>`. For `kind === 'typed-confirm'`,
   * if `typedOverride` is omitted, the entity becomes the typed string.
   */
  entityLabel?: string;
  /**
   * When `true`, the confirm button is disabled until the user types
   * the dialog's `typedString` into the input. Defaults to `false`.
   * Implied `true` when `kind === 'typed-confirm'`.
   */
  typedConfirmRequired?: boolean;
  /**
   * Override the variant's `typedString`. When supplied,
   * `typedConfirmRequired` is implicitly `true`. Use this when the
   * entity name is itself the typed-confirm string (e.g.
   * `typedOverride={quiz.title}`).
   */
  typedOverride?: string;
  /**
   * Fired when the user confirms (clicks the confirm button or
   * presses Enter when typed-confirm is satisfied).
   */
  onConfirm: () => void;
  /**
   * Fired when the user cancels (clicks cancel, presses ESC, or
   * otherwise closes the dialog without confirming).
   */
  onCancel: () => void;
  /** Optional override of the variant's confirm/cancel labels. */
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * When `true`, the confirm button is disabled and shows a spinner.
   * Used by services that await an API response before closing the
   * dialog.
   */
  loading?: boolean;
  /**
   * Optional className for the dialog content (advanced positioning).
   */
  className?: string;
  /** Optional test id for the dialog root. */
  'data-testid'?: string;
};

/**
 * Substitute `<entity>` in the variant's body when `entityLabel` is
 * supplied; otherwise leave the body untouched.
 */
function applyEntityToCopy(copy: ConfirmCopy, entityLabel: string | undefined): {
  title: string;
  body: string;
} {
  if (!entityLabel) return { title: copy.title, body: copy.body };
  return {
    title: copy.title.replace(/<entity>/g, entityLabel),
    body: copy.body.replace(/<entity>/g, entityLabel),
  };
}

/**
 * The Phase 4 destructive-action confirm dialog. See the file-level
 * docstring for the full surface and design rationale.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    kind,
    entityLabel,
    typedConfirmRequired,
    typedOverride,
    onConfirm,
    onCancel,
    confirmLabel,
    cancelLabel,
    loading,
    className,
    'data-testid': testId = 'confirm-dialog',
  } = props;

  const copy = CONFIRM_COPY[kind];
  const { title, body } = applyEntityToCopy(copy, entityLabel);

  // typed-confirm variant always requires typing. Consumers can also
  // opt in via `typedConfirmRequired` (e.g. for `destructive-permanent`
  // collections where the consumer wants the user to type a name).
  const typedString = typedOverride ?? copy.typedString;
  const typedRequired =
    typedConfirmRequired || typeof typedString === 'string' || kind === 'typed-confirm';

  // Track the user's typed-confirm input. Disabled until match.
  const [typedValue, setTypedValue] = React.useState('');

  // Confirm / cancel dedupe.
  //
  // Radix's <AlertDialogAction> auto-closes the dialog on click,
  // which fires <AlertDialog onOpenChange={false}>. We use a ref to
  // distinguish "user confirmed" from "user cancelled" so consumers
  // receive exactly one callback per open.
  const confirmedRef = React.useRef(false);
  const matchesTyped =
    !typedRequired || (typedString != null && typedValue.trim() === typedString);

  // Reset typed input + dedupe flag when the dialog closes.
  React.useEffect(() => {
    if (!open) {
      setTypedValue('');
      confirmedRef.current = false;
    }
  }, [open]);

  // Wire Enter-to-confirm inside the typed input (when satisfied).
  const handleTypedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matchesTyped && !loading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleConfirm = React.useCallback(() => {
    if (!matchesTyped || loading) return;
    confirmedRef.current = true;
    onConfirm();
  }, [matchesTyped, loading, onConfirm]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Radix closes the dialog (action click / cancel click / ESC /
        // outside click / explicit close). Only fire `onCancel` when
        // the user did NOT confirm.
        if (!confirmedRef.current) onCancel();
      }}
    >
      <AlertDialogContent
        className={cn('sm:max-w-md', className)}
        data-testid={testId}
      >
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={`${testId}-title`}>{title}</AlertDialogTitle>
          <AlertDialogDescription data-testid={`${testId}-body`}>
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {typedRequired && typeof typedString === 'string' ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${testId}-typed-input`}
              className="text-sm font-medium"
            >
              Type <span className="font-mono">{typedString}</span> to confirm
            </label>
            <Input
              id={`${testId}-typed-input`}
              data-testid={`${testId}-typed-input`}
              value={typedValue}
              onChange={(e) => setTypedValue(e.currentTarget.value)}
              onKeyDown={handleTypedKeyDown}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              disabled={loading}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testId}-cancel`} disabled={loading}>
            {cancelLabel ?? copy.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            asChild
            onClick={(e) => {
              // Confirm only when matchesTyped/loading constraints hold.
              // The preventDefault suppresses Radix's close when needed.
              if (!matchesTyped || loading) {
                e.preventDefault();
                return;
              }
              handleConfirm();
            }}
          >
            <Button
              type="button"
              disabled={!matchesTyped || !!loading}
              aria-busy={loading || undefined}
              data-testid={`${testId}-confirm`}
            >
              {confirmLabel ?? copy.confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
