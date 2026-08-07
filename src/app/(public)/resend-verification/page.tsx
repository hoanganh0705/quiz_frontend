'use client';

/**
 * `/resend-verification` route — request a new verification link.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source tickets:
 *   - TKT-2.2.B3 — Suspense boundary around `useSearchParams`.
 *   - TKT-2.2.D1 — `resend-verification.schema.ts`.
 *   - TKT-2.2.D2 — `useResendVerification` hook.
 *   - TKT-2.2.D3 — neutral acknowledgement body, cooldown UI.
 *
 * ## Anti-enumeration invariants
 *
 *   - The page renders the same `resend-acknowledgement-body` for
 *     every successful response (verified / unverified / unknown).
 *   - The page does NOT echo the user-supplied email in copy.
 *   - The submit button is disabled during pending AND during
 *     cooldown, with a countdown.
 *   - The page does NOT import `@/features/auth/api/auth`
 *     (the deprecated barrel); it consumes `auth.service.ts`
 *     via the hook.
 */

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useResendVerification } from '@/features/auth/forms/use-resend-verification'
import { resendVerificationSchema, type ResendVerificationFormValues } from '@/features/auth/forms/schemas/resend-verification.schema'
import { COPY_KEYS, resolveCopy, resolveCooldown } from '@/features/auth/copy/verify-email-copy'

// P2-22: dropped `export const dynamic = 'force-dynamic'` because
// this file is a client component (`'use client'`). The route
// segment config is a server-side directive and is meaningless
// inside a `'use client'` module — it was a no-op previously.

function ResendVerificationSkeleton() {
  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='resend-verification-skeleton'
    >
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <div className='h-7 w-56 animate-pulse rounded bg-muted' />
          <div className='h-4 w-full animate-pulse rounded bg-muted' />
        </div>
        <div className='h-10 w-full animate-pulse rounded bg-muted' />
        <div className='h-9 w-full animate-pulse rounded bg-muted' />
      </div>
    </main>
  )
}

function ResendVerificationInner() {
  const searchParams = useSearchParams()
  const defaultEmail = useMemo(
    () => searchParams.get('email') ?? '',
    [searchParams]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: defaultEmail }
  })

  const { state, start } = useResendVerification()
  const emailValue = watch('email')

  const isPending = state.status === 'pending'
  const isCooldown = state.status === 'cooldown'
  const isError = state.status === 'error'

  const submitDisabled = isPending || isCooldown || !emailValue

  // It is intentional that the page renders the same
  // acknowledgement body during cooldown. The hook's
  // `cooldownRemainingMs` is rendered next to it via
  // `resolveCooldown` so the user sees a countdown.
  const showAcknowledgement = isCooldown
  const errorCopy = isError
    ? state.errorKind === 'rate_limited'
      ? resolveCopy(COPY_KEYS.resend.error.rate_limited)
      : resolveCopy(COPY_KEYS.resend.error.server)
    : null

  const cooldownSeconds = isCooldown
    ? Math.ceil(state.cooldownRemainingMs / 1000)
    : 0

  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='resend-verification-page'
    >
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold text-foreground'>
            {showAcknowledgement
              ? resolveCopy(COPY_KEYS.resend.acknowledgement.title)
              : 'Resend verification'}
          </h1>
          <p
            className='text-sm text-muted-foreground'
            data-testid='resend-help'
          >
            {showAcknowledgement
              ? resolveCopy(COPY_KEYS.resend.acknowledgement.body)
              : resolveCopy(COPY_KEYS.resend.idle.help)}
          </p>
        </div>

        {!showAcknowledgement && (
          <form
            onSubmit={handleSubmit((values) => start(values))}
            className='space-y-4'
            data-testid='resend-form'
          >
            <div className='space-y-2'>
              <Input
                type='email'
                placeholder={resolveCopy(COPY_KEYS.resend.idle.placeholder)}
                {...register('email')}
                aria-invalid={!!errors.email}
                disabled={isPending || isCooldown}
              />
              {errors.email && (
                <p className='text-xs text-destructive'>{errors.email.message}</p>
              )}
            </div>

            <Button
              type='submit'
              disabled={submitDisabled}
              className='w-full'
              data-testid='resend-submit'
            >
              {isPending
                ? resolveCopy(COPY_KEYS.resend.loading)
                : 'Send verification email'}
            </Button>
          </form>
        )}

        {showAcknowledgement && (
          <p
            className='text-xs text-muted-foreground'
            data-testid='resend-acknowledgement-body'
            data-cooldown-remaining-ms={state.status === 'cooldown' ? state.cooldownRemainingMs : 0}
          >
            {resolveCopy(COPY_KEYS.resend.acknowledgement.body)}
          </p>
        )}

        {isCooldown && (
          <p
            className='text-xs text-muted-foreground'
            data-testid='resend-cooldown'
          >
            {resolveCooldown(cooldownSeconds)}
          </p>
        )}

        {errorCopy && (
          <p
            className='text-xs text-destructive'
            data-testid='resend-error'
            data-error-kind={state.status === 'error' ? state.errorKind : 'none'}
          >
            {errorCopy}
          </p>
        )}

        <div className='flex flex-col gap-2 text-sm'>
          <Button asChild variant='outline'>
            <Link href='/login'>Back to login</Link>
          </Button>
          <Button asChild variant='ghost'>
            <Link href='/signup'>Create a new account</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export default function ResendVerificationPage() {
  return (
    <Suspense fallback={<ResendVerificationSkeleton />}>
      <ResendVerificationInner />
    </Suspense>
  )
}