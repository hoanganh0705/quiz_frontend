'use client';

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
} from '@/features/auth/services/auth.service';

export interface VerifyPasswordModalProps {

open: boolean;

onClose: () => void;

onVerified: () => void;

hookDeps?: Parameters<typeof useVerifyPassword>[0];
}

export function VerifyPasswordModal({
open,
onClose,
onVerified,
hookDeps,
}: VerifyPasswordModalProps) {
const passwordFieldId = useId();

const { verify, status, error, result, reset } =
useVerifyPassword(hookDeps);

const [password, setPassword] = useState('');
const [reveal, setReveal] = useState(false);

useEffect(() => {
if (open) {

reset();
setPassword('');
setReveal(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, reset]);

useEffect(() => {
if (status === 'success' && result?.valid === true) {
onVerified();
      // Parent owns the open state — do NOT call reset() here
      // because the modal is closing.
    }
  }, [status, result, onVerified]);

useEffect(() => {
if (error?.classification.kind === 'auth_terminal') {
onClose();
    }
  }, [error, onClose]);

useEffect(() => {
if (error?.classification.kind === 'invalid_current') {

setPassword('');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [error]);

const handleSubmit = useCallback(
(e: React.FormEvent<HTMLFormElement>): void => {
e.preventDefault();
if (!password || status === 'pending') return;

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

const fieldErrorCopy =
classification === 'invalid_current'
? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.verifyError.invalidCurrent)
: null;

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