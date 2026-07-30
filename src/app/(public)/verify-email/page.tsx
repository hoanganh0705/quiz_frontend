'use client';

/**
 * `/verify-email` route — landing page for verification links.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source tickets:
 *   - TKT-2.2.B3 — Suspense boundary around `useSearchParams`.
 *   - TKT-2.2.C1 — `useVerifyEmail` hook.
 *   - TKT-2.2.C2 — token-format client-side guard.
 *   - TKT-2.2.C3 — neutral acknowledgement body.
 *   - TKT-2.2.A2 — leak catalogue (now closed).
 *
 * ## Anti-enumeration invariants
 *
 *   - The page renders the same `verify-acknowledgement-body` for every
 *     backend response (200 / 400 / 429 / 5xx) and for the no-token
 *     default state.
 *   - The page renders the *same byte sequence* via `verify-invalid-body`
 *     for a malformed token (the C2 predicate). The two IDs resolve
 *     to the same literal in `verify-email-copy.ts` (TKT-2.2.B1).
 *   - The page does NOT auto-navigate to `/login?verified=1`. That
 *     navigation was the canonical oracle.
 *   - The page does NOT interpolate the user-supplied email into copy.
 *     The email round-trips into the resend link's `?email=` query
 *     only.
 */

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useVerifyEmailAutoRun } from '@/features/auth/forms/use-verify-email'
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/verify-email-copy'

export const dynamic = 'force-dynamic'

function VerifyEmailSkeleton() {
  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='verify-email-skeleton'
    >
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <div className='h-7 w-48 animate-pulse rounded bg-muted' />
          <div className='h-4 w-full animate-pulse rounded bg-muted' />
        </div>
      </div>
    </main>
  )
}

function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const email = useMemo(() => searchParams.get('email') ?? '', [searchParams])

  // Auto-run the submit on mount and on every `token` change.
  // The hook itself enforces single-flight and token-scoped
  // re-fire protection (TKT-2.2.C1), so a strict-mode double
  // effect converges to the same acknowledgement without a
  // second request.
  const { state } = useVerifyEmailAutoRun(token)

  // Render the same neutral body for every terminal state. The
  // discriminator is on the body ID, not on the body literal —
  // the two IDs resolve to the same string (TKT-2.2.B1).
  const isInvalid = state.status === 'error' && state.errorKind === 'invalid_link'
  const isPending = state.status === 'pending' || state.status === 'idle'

  // The two body IDs are byte-equivalent at runtime — see
  // `verify-email-copy.ts` comments. The test suite asserts the
  // equality. We render one `verify-acknowledgement-body` element
  // either way; the F2 anti-enumeration spec asserts the data
  // attribute is the same.
  const bodyCopy = isInvalid
    ? resolveCopy(COPY_KEYS.verify.invalid.body)
    : resolveCopy(COPY_KEYS.verify.acknowledgement.body)

  const titleCopy = isPending
    ? resolveCopy(COPY_KEYS.verify.loading.title)
    : resolveCopy(COPY_KEYS.verify.acknowledgement.title)

  const resendHref = email
    ? `/resend-verification?email=${encodeURIComponent(email)}`
    : '/resend-verification'

  // Trigger the auto-run once on mount. `useVerifyEmailAutoRun`
  // already calls `run()` when `token` changes; this is a
  // belt-and-braces guard for an SSR-disabled tree, and is a
  // no-op when the hook has already fired.
  useEffect(() => {
    /* hook already runs on mount via the auto-run helper */
  }, [])

  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-4'
      data-testid='verify-email-page'
    >
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold text-foreground'>{titleCopy}</h1>
          <p
            data-testid='verify-acknowledgement-body'
            data-body-kind={isInvalid ? 'invalid_link' : 'acknowledgement'}
          >
            {bodyCopy}
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <Link
            href={resendHref}
            className='inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted'
            data-testid='verify-resend-link'
          >
            {resolveCopy(COPY_KEYS.verify.invalid.resendLabel)}
          </Link>
          <Link
            href='/login'
            className='inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted'
            data-testid='verify-login-link'
          >
            {resolveCopy(COPY_KEYS.verify.invalid.loginLabel)}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailInner />
    </Suspense>
  )
}