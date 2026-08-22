'use client';

import { useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
PASSWORD_COPY_KEYS,
resolvePasswordCopy,
} from '@/features/auth/services/auth.service';

export interface ChangePasswordSuccessBannerProps {

onDismiss: () => void;

autoDismissMs?: number;
}

export function ChangePasswordSuccessBanner({
onDismiss,
autoDismissMs = 3000,
}: ChangePasswordSuccessBannerProps) {
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
<CheckCircle2 className='w-5 h-5 text-success dark:text-green-400 shrink-0' />
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