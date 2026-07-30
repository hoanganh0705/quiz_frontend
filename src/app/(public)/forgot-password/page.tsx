'use client'

/**
 * `/forgot-password` route — request a password reset link.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source tickets:
 *   - TKT-2.3.B3 — Suspense boundary around `useSearchParams`.
 *   - TKT-2.3.C1 — `forgot-password.schema.ts`.
 *   - TKT-2.3.C3 — `useForgotPassword` hook.
 *   - TKT-2.3.C4 — neutral acknowledgement body, cooldown UI,
 *                  no `mailto:` deep-link, no email echo in copy.
 *
 * ## Anti-enumeration invariants
 *
 *   - The page renders the same `forgot-acknowledgement-body` for
 *     every successful response (verified / unverified / unknown).
 *   - The page does NOT echo the user-supplied email in copy.
 *   - The submit button is disabled during pending AND during
 *     cooldown, with a countdown.
 *   - The page does NOT contain a `mailto:` link. The "Open email
 *     app" affordance from the original page leaked the
 *     user-supplied address into the host mail client; the
 *     backend's anti-enumeration discipline does not authorise
 *     this.
 *   - The page does NOT import `@/features/auth/api/auth`
 *     (the deprecated barrel); it consumes `auth.service.ts`
 *     via the hook.
 */

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

import { useForgotPassword } from '@/features/auth/forms/use-forgot-password'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/forms/schemas/forgot-password.schema'
import { COPY_KEYS, resolveCopy, resolveCooldown } from '@/features/auth/copy/recovery-copy'

export const dynamic = 'force-dynamic'

function ForgotPasswordSkeleton() {
  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='forgot-password-skeleton'
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

/**
 * The `?email=` query parameter is forwarded to the form field
 * as a pre-fill. It is NEVER echoed into copy. The C3 hook starts
 * the cooldown timer when the submit succeeds; the page renders
 * the same acknowledgement body regardless of whether the address
 * exists.
 */
function ForgotPasswordInner() {
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
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail }
  })

  const { state, cooldownRemainingMs, start } = useForgotPassword()
  const emailValue = watch('email')

  const isPending = state.status === 'pending'
  const isCooldown = state.status === 'cooldown'
  const isError = state.status === 'error'

  const submitDisabled = isPending || isCooldown || !emailValue

  // The page renders the same acknowledgement body for both
  // 'cooldown' (the success path) and 'error' with the
  // 'acknowledgement' kind (any 4xx the mapper collapsed). For
  // explicit error kinds (rate_limited, server) the error
  // overlay copy renders in addition to the same body.
  const showAcknowledgement = isCooldown || (isError && state.errorKind === 'acknowledgement')

  const errorCopy = isError && state.errorKind !== 'acknowledgement'
    ? state.errorKind === 'rate_limited'
      ? resolveCopy(COPY_KEYS.forgot.error.rate_limited)
      : resolveCopy(COPY_KEYS.forgot.error.server)
    : null

  const cooldownSeconds = isCooldown
    ? Math.ceil(cooldownRemainingMs / 1000)
    : 0

  // Suppress unused-var warnings for `useEffect`; the hook
  // already triggers itself on mount via the form submit.
  useEffect(() => {}, [])

  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='forgot-password-page'
    >
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold text-foreground'>
            {showAcknowledgement
              ? resolveCopy(COPY_KEYS.forgot.acknowledgement.title)
              : 'Forgot password'}
          </h1>
          <p
            className='text-sm text-muted-foreground'
            data-testid='forgot-help'
          >
            {showAcknowledgement
              ? resolveCopy(COPY_KEYS.forgot.acknowledgement.body)
              : resolveCopy(COPY_KEYS.forgot.idle.help)}
          </p>
        </div>

        {!showAcknowledgement && (
          <form
            onSubmit={handleSubmit((values) => start(values.email))}
            className='space-y-4'
            data-testid='forgot-form'
          >
            <div className='space-y-2'>
              <Input
                type='email'
                placeholder={resolveCopy(COPY_KEYS.forgot.idle.placeholder)}
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
              data-testid='forgot-submit'
            >
              {isPending
                ? resolveCopy(COPY_KEYS.forgot.loading)
                : 'Send reset link'}
            </Button>
          </form>
        )}

        {showAcknowledgement && (
          <p
            className='text-xs text-muted-foreground'
            data-testid='forgot-acknowledgement-body'
            data-cooldown-remaining-ms={isCooldown ? cooldownRemainingMs : 0}
          >
            {resolveCopy(COPY_KEYS.forgot.acknowledgement.body)}
          </p>
        )}

        {isCooldown && (
          <p
            className='text-xs text-muted-foreground'
            data-testid='forgot-cooldown'
          >
            {resolveCooldown(cooldownSeconds)}
          </p>
        )}

        {errorCopy && (
          <p
            className='text-xs text-destructive'
            data-testid='forgot-error'
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPasswordInner />
    </Suspense>
  )
}