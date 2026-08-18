'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { InlineError } from '@/components/ui/loading-states/ErrorState';
import { cn } from '@/shared/utils/merge-class-names';
import {
useChangePassword,
type ChangePasswordFieldErrors,
type UseChangePasswordDeps,
} from '@/features/auth/hooks/use-change-password';
import { getPasswordStrength } from '@/features/auth/utils/password-strength';
import {
PASSWORD_COPY_KEYS,
resolvePasswordCopy,
} from '@/features/auth/services/auth.service';
import { ChangePasswordSuccessBanner } from './change-password-success-banner';

export interface ChangePasswordCardProps {

hookDeps?: UseChangePasswordDeps;

onCollapseAfterSuccess?: () => void;
}

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

function ChangePasswordCardInner({
hookDeps,
onCollapseAfterSuccess,
}: ChangePasswordCardProps) {
const currentFieldId = useId();
const newFieldId = useId();
const confirmFieldId = useId();

const { change, status, error, reset } = useChangePassword(hookDeps);

const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const [revealCurrent, setRevealCurrent] = useState(false);
const [revealNew, setRevealNew] = useState(false);
const [revealConfirm, setRevealConfirm] = useState(false);

const [showSuccess, setShowSuccess] = useState(false);
const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const serverFieldErrors: ChangePasswordFieldErrors | undefined =
error && 'fieldErrors' in error
? (error.fieldErrors as ChangePasswordFieldErrors)
: undefined;

const lastKindRef = useRef<string | null>(null);
const currentKind = error?.classification.kind ?? null;
if (currentKind !== lastKindRef.current) {
lastKindRef.current = currentKind;
if (currentKind === 'invalid_current' && currentPassword !== '') {
setCurrentPassword('');
    }
  }

useEffect(() => {
if (status === 'success' && !showSuccess) {

setCurrentPassword('');
setNewPassword('');
setConfirmPassword('');
setShowSuccess(true);
reset();

if (onCollapseAfterSuccess && collapseTimerRef.current === null) {
collapseTimerRef.current = setTimeout(() => {
collapseTimerRef.current = null;
onCollapseAfterSuccess();
        }, 3000);
      }
    }
return () => {
if (collapseTimerRef.current !== null) {
clearTimeout(collapseTimerRef.current);
collapseTimerRef.current = null;
      }
    };
  }, [status, showSuccess, reset, onCollapseAfterSuccess]);

const handleSubmit = useCallback(
(e: React.FormEvent<HTMLFormElement>): void => {
e.preventDefault();
if (status === 'pending') return;
if (!currentPassword || !newPassword || !confirmPassword) return;
void change({ currentPassword, newPassword, confirmPassword });
    },
[change, currentPassword, newPassword, confirmPassword, status],
  );

const handleCancel = useCallback((): void => {
setCurrentPassword('');
setNewPassword('');
setConfirmPassword('');
setRevealCurrent(false);
setRevealNew(false);
setRevealConfirm(false);
reset();
  }, [reset]);

const handleDismissSuccess = useCallback((): void => {
setShowSuccess(false);
  }, []);

const handleRetry = useCallback((): void => {
if (status === 'pending') return;
if (!currentPassword || !newPassword || !confirmPassword) return;
void change({ currentPassword, newPassword, confirmPassword });
  }, [change, currentPassword, newPassword, confirmPassword, status]);

const errorFor = (field: FieldName): string | null => {
const err = serverFieldErrors?.[field];
if (err) {
return resolveFieldErrorKey(field, err);
    }
return null;
  };

const resolveFieldErrorKey = (
field: FieldName,
key: string,
  ): string => {
const KEY_MAP: Record<string, string> = {
invalidCurrent: PASSWORD_COPY_KEYS.password.errors.invalidCurrent,
reuse: PASSWORD_COPY_KEYS.password.errors.reuse,
mismatch: PASSWORD_COPY_KEYS.password.errors.mismatch,
weak: PASSWORD_COPY_KEYS.password.errors.weak,
equalToCurrent: PASSWORD_COPY_KEYS.password.errors.equalToCurrent,
required: PASSWORD_COPY_KEYS.password.errors.required,
tooShort: PASSWORD_COPY_KEYS.password.errors.tooShort,
    };
void field;
return resolvePasswordCopy(KEY_MAP[key] ?? key);
  };

const strength = getPasswordStrength(newPassword);
const showStrengthMeter = newPassword.length > 0;

const submitDisabled =
status === 'pending' ||
!currentPassword ||
!newPassword ||
!confirmPassword;

const currentFieldError = errorFor('currentPassword');
const newFieldError = errorFor('newPassword');
const confirmFieldError = errorFor('confirmPassword');

const classificationKind = error?.classification.kind;
const bannerCopy =
classificationKind === 'conflict'
? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.conflict)
: classificationKind === 'auth_terminal'
? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.authTerminal)
: classificationKind === 'retryable'
? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.retryable)
: null;

return (
<Card
data-testid='change-password-card'
data-status={status}
className='mt-6'
    >
<CardHeader>
<CardTitle className='text-xl'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.title,
          )}
</CardTitle>
<CardDescription>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.subtitle,
          )}
</CardDescription>
</CardHeader>
<CardContent>
{showSuccess && (
<div className='mb-6' data-testid='change-password-success-slot'>
<ChangePasswordSuccessBanner onDismiss={handleDismissSuccess} />
</div>
        )}

<form
onSubmit={handleSubmit}
className='space-y-4'
aria-busy={status === 'pending'}
data-testid='change-password-form'
        >
{/* ─── Current password field ─────────────────────────────── */}
<div className='space-y-2'>
<Label htmlFor={currentFieldId} className='text-sm font-medium'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.currentLabel,
              )}
</Label>
<div className='relative'>
<Input
id={currentFieldId}
type={revealCurrent ? 'text' : 'password'}
autoComplete='current-password'
value={currentPassword}
onChange={(e) => setCurrentPassword(e.target.value)}
placeholder={resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.currentPlaceholder,
                )}
disabled={status === 'pending'}
aria-invalid={Boolean(currentFieldError)}
aria-describedby={
currentFieldError ? `${currentFieldId}-error` : undefined
                }
className={cn(
'pr-10',
currentFieldError &&
'border-destructive focus-visible:border-destructive',
                )}
              />
<button
type='button'
onClick={() => setRevealCurrent((r) => !r)}
disabled={status === 'pending'}
className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50'
aria-label={
revealCurrent
? resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.hide,
                      )
: resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.reveal,
                      )
                }
data-testid='change-password-current-reveal'
              >
{revealCurrent ? (
<EyeOff className='w-4 h-4' />
                ) : (
<Eye className='w-4 h-4' />
                )}
</button>
</div>
{currentFieldError && (
<p
id={`${currentFieldId}-error`}
className='text-sm text-destructive'
role='alert'
data-testid='change-password-current-error'
              >
{currentFieldError}
</p>
            )}
</div>

{/* ─── New password field ─────────────────────────────────── */}
<div className='space-y-2'>
<Label htmlFor={newFieldId} className='text-sm font-medium'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.newLabel,
              )}
</Label>
<div className='relative'>
<Input
id={newFieldId}
type={revealNew ? 'text' : 'password'}
autoComplete='new-password'
value={newPassword}
onChange={(e) => setNewPassword(e.target.value)}
placeholder={resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.newPlaceholder,
                )}
disabled={status === 'pending'}
aria-invalid={Boolean(newFieldError)}
aria-describedby={
newFieldError ? `${newFieldId}-error` : undefined
                }
className={cn(
'pr-10',
newFieldError &&
'border-destructive focus-visible:border-destructive',
                )}
              />
<button
type='button'
onClick={() => setRevealNew((r) => !r)}
disabled={status === 'pending'}
className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50'
aria-label={
revealNew
? resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.hide,
                      )
: resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.reveal,
                      )
                }
data-testid='change-password-new-reveal'
              >
{revealNew ? (
<EyeOff className='w-4 h-4' />
                ) : (
<Eye className='w-4 h-4' />
                )}
</button>
</div>
{newFieldError && (
<p
id={`${newFieldId}-error`}
className='text-sm text-destructive'
role='alert'
data-testid='change-password-new-error'
              >
{newFieldError}
</p>
            )}
{showStrengthMeter && (
<div
className='mt-2'
data-testid='change-password-strength'
aria-label={resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.strength.heading,
                )}
              >
<div className='flex items-center justify-between text-xs mb-1'>
<span className='text-muted-foreground'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.strength.heading,
                    )}
</span>
<span
className='font-medium'
data-testid='change-password-strength-label'
                  >
{resolvePasswordCopy(
strength.score >= 4
? PASSWORD_COPY_KEYS.password.strength.strong
: strength.score === 3
? PASSWORD_COPY_KEYS.password.strength.good
: strength.score === 2
? PASSWORD_COPY_KEYS.password.strength.fair
: strength.score === 1
? PASSWORD_COPY_KEYS.password.strength.weak
: PASSWORD_COPY_KEYS.password.strength.tooWeak,
                    )}
</span>
</div>
<div
className='h-1.5 bg-muted rounded-full overflow-hidden'
role='progressbar'
aria-valuenow={strength.score}
aria-valuemin={0}
aria-valuemax={4}
                >
<div
className={cn(
'h-full transition-all',
strength.score >= 4
? 'bg-green-500'
: strength.score >= 3
? 'bg-emerald-500'
: strength.score >= 2
? 'bg-amber-500'
: 'bg-red-500',
                    )}
style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
</div>
<p className='mt-1 text-xs text-muted-foreground'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.strength.requirements,
                  )}
</p>
</div>
            )}
</div>

{/* ─── Confirm new password field ─────────────────────────── */}
<div className='space-y-2'>
<Label htmlFor={confirmFieldId} className='text-sm font-medium'>
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.confirmLabel,
              )}
</Label>
<div className='relative'>
<Input
id={confirmFieldId}
type={revealConfirm ? 'text' : 'password'}
autoComplete='new-password'
value={confirmPassword}
onChange={(e) => setConfirmPassword(e.target.value)}
placeholder={resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.confirmPlaceholder,
                )}
disabled={status === 'pending'}
aria-invalid={Boolean(confirmFieldError)}
aria-describedby={
confirmFieldError ? `${confirmFieldId}-error` : undefined
                }
className={cn(
'pr-10',
confirmFieldError &&
'border-destructive focus-visible:border-destructive',
                )}
              />
<button
type='button'
onClick={() => setRevealConfirm((r) => !r)}
disabled={status === 'pending'}
className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50'
aria-label={
revealConfirm
? resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.hide,
                      )
: resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.reveal,
                      )
                }
data-testid='change-password-confirm-reveal'
              >
{revealConfirm ? (
<EyeOff className='w-4 h-4' />
                ) : (
<Eye className='w-4 h-4' />
                )}
</button>
</div>
{confirmFieldError && (
<p
id={`${confirmFieldId}-error`}
className='text-sm text-destructive'
role='alert'
data-testid='change-password-confirm-error'
              >
{confirmFieldError}
</p>
            )}
</div>

{bannerCopy && (
<div
className='rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-center justify-between gap-2'
role='alert'
data-testid='change-password-banner'
            >
<p className='text-sm text-destructive'>{bannerCopy}</p>
{classificationKind === 'retryable' && (
<Button
type='button'
size='sm'
variant='outline'
onClick={handleRetry}
disabled={submitDisabled}
className='shrink-0 gap-1'
data-testid='change-password-retry'
                >
<RefreshCw className='w-3 h-3' />
Retry
                </Button>
              )}
</div>
          )}

{error && !bannerCopy && !currentFieldError && !newFieldError && !confirmFieldError && (
<InlineError
message={resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.error.generic,
              )}
            />
          )}

<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border'>
<a
href='/forgot-password'
className='text-sm text-default hover:underline'
data-testid='change-password-forgot-link'
            >
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.forgotLink,
              )}
</a>
<div className='flex gap-2'>
<Button
type='button'
variant='ghost'
onClick={handleCancel}
disabled={status === 'pending'}
data-testid='change-password-cancel'
              >
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.cancel,
                )}
</Button>
<Button
type='submit'
disabled={submitDisabled}
data-testid='change-password-submit'
              >
{status === 'pending' && (
<Loader2 className='w-4 h-4 animate-spin' />
                )}
{resolvePasswordCopy(
PASSWORD_COPY_KEYS.password.changePassword.submit,
                )}
</Button>
</div>
</div>
</form>
</CardContent>
</Card>
  );
}

export const ChangePasswordCard = memo(ChangePasswordCardInner);