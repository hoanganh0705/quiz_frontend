'use client';

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

open: boolean;

onOpenChange: (open: boolean) => void;

hook: UseDeleteAccountResult;
}

export function DeleteAccountModal({
open,
onOpenChange,
hook,
}: DeleteAccountModalProps): React.JSX.Element {

const [password, setPassword] = useState('');
const [typedConfirmation, setTypedConfirmation] = useState('');
const [revealPassword, setRevealPassword] = useState(false);

useEffect(() => {
return () => {
setPassword('');
setTypedConfirmation('');
setRevealPassword(false);
    };
  }, []);

const state = hook.state;

const isPending = state.kind === 'pending';
const isCleanup = state.kind === 'cleanup';
const isCompleted = state.kind === 'completed';
const isTerminal = isCleanup || isCompleted;

const error = state.kind === 'idle' || state.kind === 'pending'
? state.error
: state.kind === 'uncertain'
? state.error
: null;

const classification = error?.classification ?? null;

const passwordFieldError =
classification && isInvalidCurrentPasswordDeletion(classification)
? true
: false;

const bannerError =
classification && !isInvalidCurrentPasswordDeletion(classification)
? classification
: null;

const canSubmit =
state.kind === 'idle' &&
password.length > 0 &&
typedConfirmation === DELETION_INTENT_TOKEN &&
!isTerminal;

const passwordDisabled = isPending || isCleanup || isCompleted;

const handleCloseAttempt = useCallback(
(next: boolean) => {
if (!next && isPending) {

return;
      }
if (!next && isTerminal) {

return;
      }
if (!next) {

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

return (
<Dialog
open={open}
onOpenChange={handleCloseAttempt}
    >
<DialogContent
className='sm:max-w-md'

showCloseButton={!isTerminal}

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
