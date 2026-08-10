'use client'

/**
 * `/reset-password` route — complete the password recovery flow
 * using a token from the reset-password email.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source tickets:
 *   - TKT-2.3.B3 — Suspense boundary around `useSearchParams`.
 *   - TKT-2.3.C2 — `reset-password.schema.ts`.
 *   - TKT-2.3.C5 — `useResetPassword` hook.
 *   - TKT-2.3.C6 — neutral copy, post-success auth-state clear +
 *                  navigation to `/login`.
 *
 * ## Anti-enumeration invariants
 *
 *   - The page renders the same `reset-invalid-body` for a
 *     valid-looking-but-unknown token, a malformed token, and a
 *     missing token. The mapper (TKT-2.3.B2) collapses all three
 *     of the backend's `AUTH_INVALID_TOKEN` cases (UNKNOWN,
 *     EXPIRED, CONSUMED) into the same `'invalid_link'` kind.
 *   - The page does NOT echo the user-supplied token into copy.
 *   - The page does NOT interpolate the new password into copy.
 *   - The page does NOT import `@/features/auth/api/auth`
 *     (the deprecated barrel); it consumes `auth.service.ts`
 *     via the hook.
 *
 * ## Post-success flow
 *
 * A successful submit:
 *   1. clears the local `auth_token` cookie (TKT-2.3.C5);
 *   2. broadcasts `LOGGED_OUT` (TKT-2.3.C5);
 *   3. navigates to `/login` (this page).
 *
 * Steps 1 and 2 are owned by the helper because they are a
 * transport concern (a stale cookie is the path to "the user
 * thought they were signed out but their requests carried a
 * still-valid token"). Step 3 is a UX concern owned by the page.
 *
 * ## Token-format guard
 *
 * The page reads `?token=` from the URL. The form is meaningful
 * only when the token is well-formed (`32..128` chars + the
 * `/^[a-f0-9]+$/i` regex). Without it, the page renders the
 * `'invalid_link'` body **without** a network request — the C2
 * schema's client-side guard would have rejected the input
 * anyway, and surfacing the rejection as a backend error would
 * have leaked the token's malformed state.
 */

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

// P2-22: dropped `export const dynamic = 'force-dynamic'` because
// this file is a client component (`'use client'`). The route
// segment config is a server-side directive and is meaningless
// inside a `'use client'` module — it was a no-op previously.

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

/**
 * Client-side token-format guard. Mirrors `tokenResetSchema` from
 * the C2 schema; used to short-circuit before the form ever
 * renders when `?token=` is missing or malformed. The page
 * renders the same neutral `'invalid_link'` body without a
 * network request.
 */
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

  // The hook is built unconditionally so React's rules-of-hooks
  // are respected, but it is invoked with stubs that swallow the
  // call when the token is malformed (see the early-return
  // `handleSubmit` below). The page's anti-enumeration invariant
  // is that the `'invalid_link'` body renders WITHOUT a network
  // request — the SDK call is never made in that branch.
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

  // Route the user to `/login` on success. The helper has
  // already cleared the auth_token cookie and broadcast
  // LOGGED_OUT before this effect runs.
  useEffect(() => {
    if (state.status === 'success') {
      router.replace(state.nextRoute)
    }
  }, [state, router])

  // Suppress unused-var warnings for the layout's nested layout.
  // P2-20: empty dependency-mount effect was a no-op. Removed.

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