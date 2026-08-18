'use client'

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useResetPassword } from '@/features/auth/forms/use-reset-password'
import {
resetPasswordSchema,
tokenResetSchema,
toResetPasswordDto,
type ResetPasswordFormValues,
} from '@/features/auth/forms/schemas/reset-password.schema'
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/recovery-copy'
import { clearAuthToken } from '@/features/auth/utils/auth-cookies'
import { broadcastAuth } from '@/features/auth/services/auth.service'

function ResetPasswordSkeleton() {
return (
<main
className='min-h-screen flex items-center justify-center bg-background px-4'
data-testid='reset-password-skeleton'
    >
<div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
<div className='space-y-2'>
<div className='h-7 w-56 animate-pulse rounded bg-muted' />
<div className='h-4 w-full animate-pulse rounded bg-muted' />
</div>
<div className='h-10 w-full animate-pulse rounded bg-muted' />
<div className='h-10 w-full animate-pulse rounded bg-muted' />
<div className='h-10 w-full animate-pulse rounded bg-muted' />
<div className='h-9 w-full animate-pulse rounded bg-muted' />
</div>
</main>
  )
}

function isWellFormedResetToken(token: string | null): boolean {
if (!token) return false;
const result = tokenResetSchema.safeParse(token);
return result.success;
}

function ResetPasswordInner() {
const router = useRouter()
const searchParams = useSearchParams()
const tokenFromUrl = useMemo(
() => searchParams.get('token'),
[searchParams]
  )

const tokenIsValid = useMemo(
() => isWellFormedResetToken(tokenFromUrl),
[tokenFromUrl]
  )

const { state, run } = useResetPassword({
resetPassword: async () => undefined,
clearAuthToken: () => clearAuthToken(),
broadcastLogout: () => broadcastAuth({ type: 'LOGGED_OUT' }),
  })

const isPending = state.status === 'pending'
const isError = state.status === 'error'
const isSuccess = state.status === 'success'
const isInvalidLink = !tokenIsValid || (isError && state.errorKind === 'invalid_link')

const {
register,
handleSubmit,
formState: { errors },
  } = useForm<ResetPasswordFormValues>({
resolver: zodResolver(resetPasswordSchema),
defaultValues: {
token: tokenFromUrl ?? '',
newPassword: '',
newPasswordConfirmation: '',
    },
  })

useEffect(() => {
if (state.status === 'success') {
router.replace(state.nextRoute)
    }
  }, [state, router])

return (
<main
className='min-h-screen flex items-center justify-center bg-background px-4'
data-testid='reset-password-page'
    >
<div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
<div className='space-y-2'>
<h1 className='text-2xl font-bold text-foreground'>
{isSuccess
? resolveCopy(COPY_KEYS.reset.success.title)
: isPending
? resolveCopy(COPY_KEYS.reset.loading.title)
: isInvalidLink
? resolveCopy(COPY_KEYS.reset.invalid.title)
: 'Reset your password'}
</h1>
<p
className='text-sm text-muted-foreground'
data-testid='reset-help'
          >
{isSuccess
? resolveCopy(COPY_KEYS.reset.success.body)
: isPending
? resolveCopy(COPY_KEYS.reset.loading.body)
: isInvalidLink
? resolveCopy(COPY_KEYS.reset.invalid.body)
: 'Enter the new password for your account.'}
</p>
</div>

{isInvalidLink && (
<div
className='rounded-md border border-border bg-muted/40 p-4 text-sm'
data-testid='reset-invalid-body'
data-token-present={tokenFromUrl ? 'true' : 'false'}
data-token-valid={tokenIsValid ? 'true' : 'false'}
          >
<p className='text-sm text-muted-foreground'>
{resolveCopy(COPY_KEYS.reset.invalid.body)}
</p>
</div>
        )}

{!isInvalidLink && !isSuccess && (
<form
onSubmit={handleSubmit(async (values) => {
const dto = toResetPasswordDto(values)
await run(dto)
            })}
className='space-y-4'
data-testid='reset-form'
          >
<input type='hidden' {...register('token')} />

<div className='space-y-2'>
<label
htmlFor='newPassword'
className='text-sm font-medium text-foreground'
              >
New password
              </label>
<Input
id='newPassword'
type='password'
placeholder='At least 8 characters'
{...register('newPassword')}
aria-invalid={!!errors.newPassword}
disabled={isPending}
              />
{errors.newPassword && (
<p className='text-xs text-destructive'>{errors.newPassword.message}</p>
              )}
</div>

<div className='space-y-2'>
<label
htmlFor='newPasswordConfirmation'
className='text-sm font-medium text-foreground'
              >
Confirm new password
              </label>
<Input
id='newPasswordConfirmation'
type='password'
placeholder='Re-enter your new password'
{...register('newPasswordConfirmation')}
aria-invalid={!!errors.newPasswordConfirmation}
disabled={isPending}
              />
{errors.newPasswordConfirmation && (
<p className='text-xs text-destructive'>
{errors.newPasswordConfirmation.message}
</p>
              )}
</div>

<Button
type='submit'
disabled={isPending}
className='w-full'
data-testid='reset-submit'
            >
{isPending
? resolveCopy(COPY_KEYS.reset.loading.title)
: 'Update password'}
</Button>
</form>
        )}

{isSuccess && (
<p
className='text-xs text-muted-foreground'
data-testid='reset-success-body'
          >
{resolveCopy(COPY_KEYS.reset.success.body)}
</p>
        )}

{isError && state.errorKind !== 'invalid_link' && (
<p
className='text-xs text-destructive'
data-testid='reset-error'
data-error-kind={state.errorKind}
          >
{state.errorKind === 'validation'
? resolveCopy(COPY_KEYS.reset.error.validation)
: state.errorKind === 'rate_limited'
? resolveCopy(COPY_KEYS.reset.error.rate_limited)
: resolveCopy(COPY_KEYS.reset.error.server)}
</p>
        )}

<div className='flex flex-col gap-2 text-sm'>
<Button asChild variant='outline'>
<Link href='/forgot-password'>
{resolveCopy(COPY_KEYS.reset.invalid.forgotLabel)}
</Link>
</Button>
<Button asChild variant='ghost'>
<Link href='/login'>
{resolveCopy(COPY_KEYS.reset.invalid.loginLabel)}
</Link>
</Button>
</div>
</div>
</main>
  )
}

export default function ResetPasswordPage() {
return (
<Suspense fallback={<ResetPasswordSkeleton />}>
<ResetPasswordInner />
</Suspense>
  )
}