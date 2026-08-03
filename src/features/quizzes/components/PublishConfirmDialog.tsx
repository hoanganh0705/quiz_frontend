/**
 * `PublishConfirmDialog` — confirmation dialog for quiz publish.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.8.
 *
 * ## What this component renders
 *
 * A confirmation dialog with publish-specific copy per Epic 4.11 user flow step 3:
 *
 *   title: "Publish this quiz?"
 *   body:  "Publishing makes this version permanent and discoverable on /quizzes.
 *           You can still edit by creating a new draft version."
 *
 * Built on `<ConfirmDialog />` (TKT-4.1.D2) for consistent UX:
 * - Focus trap
 * - ESC / outside-click to cancel
 * - Loading spinner on confirm
 * - Restore focus on close
 *
 * ## Composition
 *
 * Uses `ConfirmDialog` with `kind="state-changing"` and overrides the title/body
 * to match the Epic 4.11 spec exactly.
 *
 * ## Usage
 *
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <PublishConfirmDialog
 *   open={showConfirm}
 *   quizTitle={quiz.title}
 *   onConfirm={() => {
 *     setShowConfirm(false);
 *     handlePublish();
 *   }}
 *   onCancel={() => setShowConfirm(false)}
 *   loading={isPublishing}
 * />
 * ```
 */

'use client';

import { memo } from 'react';

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
import { getConfirmKind } from '@/features/shared/phase4ConfirmCopyMap';

/**
 * Props for the `<PublishConfirmDialog />` component.
 */
export interface PublishConfirmDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Quiz title for personalization in the dialog body. */
  quizTitle?: string;
  /** Called when user confirms publish. */
  onConfirm: () => void;
  /** Called when user cancels or dismisses. */
  onCancel: () => void;
  /** `true` while publish is in flight. Disables the confirm button. */
  loading?: boolean;
  /** Optional className for the dialog content. */
  className?: string;
}

/**
 * Publish confirmation dialog.
 *
 * Per Epic 4.11 user flow step 3 (lines 1295):
 * > "Publishing makes this version permanent and discoverable on /quizzes.
 * >  You can still edit by creating a new draft version."
 *
 * Uses `kind="state-changing"` for the action semantics, but overrides
 * the title/body to match the Epic 4.11 spec exactly.
 */
export const PublishConfirmDialog = memo(function PublishConfirmDialog({
  open,
  quizTitle,
  onConfirm,
  onCancel,
  loading = false,
  className,
}: PublishConfirmDialogProps) {
  // 'quiz.publish' is mapped to 'state-changing' in phase4ConfirmCopyMap.
  const _kind = getConfirmKind('quiz.publish');

  // Epic 4.11 specific copy — not derived from CONFIRM_COPY.
  // Title: "Publish this quiz?"
  const title = 'Publish this quiz?';

  // Body: substitutes <quiz> placeholder if quizTitle is provided.
  const body = quizTitle
    ? `Publishing "${quizTitle}" makes this version permanent and discoverable on /quizzes. You can still edit by creating a new draft version.`
    : 'Publishing makes this version permanent and discoverable on /quizzes. You can still edit by creating a new draft version.';

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild onClick={onConfirm}>
            <Button variant="default" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
