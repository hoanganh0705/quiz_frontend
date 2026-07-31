'use client';

/**
 * `ChangePasswordSuccessBanner` — transient success indicator for
 * a successful password change.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T13.
 *
 * ## Purpose
 *
 * Confirms to the user that their password was changed AND that
 * every other session has been revoked. Inline within the
 * change-password card slot — NOT a global toast — so the user can
 * see "your password changed AND your other sessions were revoked"
 * in one glance.
 *
 * ## Auto-dismiss
 *
 * Auto-dismisses after `autoDismissMs` (default 3000). The
 * countdown starts on mount; pausing is NOT supported — the
 * transient UX is part of the contract.
 *
 * ## Keyboard dismissal
 *
 * Escape or click on the close button dismisses the banner. The
 * parent's `onDismiss` callback fires either way so the parent
 * can collapse the change-password slot back to the "Change
 * password" CTA.
 *
 * ## ARIA
 *
 * `role="status"` + `aria-live="polite"` so screen-reader users
 * hear the confirmation without the announcement interrupting the
 * user's current focus.
 *
 * @see ChangePasswordCard (2.9.T11)
 */

import { useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  PASSWORD_COPY_KEYS,
  resolvePasswordCopy,
} from '@/features/auth/service/auth.service';

export interface ChangePasswordSuccessBannerProps {
  /**
   * Fired when the user dismisses (click / Escape) OR the
   * auto-dismiss timer fires. The parent uses this to collapse
   * the change-password slot back to the "Change password" CTA.
   */
  onDismiss: () => void;
  /**
   * Auto-dismiss timeout in milliseconds. Defaults to 3000.
   */
  autoDismissMs?: number;
}

export function ChangePasswordSuccessBanner({
  onDismiss,
  autoDismissMs = 3000,
}: ChangePasswordSuccessBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule auto-dismiss on mount. Cleanup on unmount.
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onDismiss();
    }, autoDismissMs);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoDismissMs, onDismiss]);

  // Escape dismisses the banner.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => {
        window.removeEventListener('keydown', handleKey);
      };
    }
    return undefined;
  }, [onDismiss]);

  const handleClose = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      role='status'
      aria-live='polite'
      className='flex items-center justify-between gap-3 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
      data-testid='change-password-success-banner'
    >
      <div className='flex items-center gap-2'>
        <CheckCircle2 className='w-5 h-5 text-green-600 dark:text-green-400 shrink-0' />
        <p className='text-sm text-green-700 dark:text-green-300'>
          {resolvePasswordCopy(PASSWORD_COPY_KEYS.password.changePassword.success)}
        </p>
      </div>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        onClick={handleClose}
        className='text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 h-8 w-8 shrink-0'
        aria-label='Dismiss'
        data-testid='change-password-success-close'
      >
        <X className='w-4 h-4' />
      </Button>
    </div>
  );
}