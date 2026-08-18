'use client';

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useVerifyEmailAutoRun } from '@/features/auth/forms/use-verify-email'
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/verify-email-copy'

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

const { state } = useVerifyEmailAutoRun(token)

const isInvalid = state.status === 'error' && state.errorKind === 'invalid_link'
const isPending = state.status === 'pending' || state.status === 'idle'

const bodyCopy = isInvalid
? resolveCopy(COPY_KEYS.verify.invalid.body)
: resolveCopy(COPY_KEYS.verify.acknowledgement.body)

const titleCopy = isPending
? resolveCopy(COPY_KEYS.verify.loading.title)
: resolveCopy(COPY_KEYS.verify.acknowledgement.title)

const resendHref = email
? `/resend-verification?email=${encodeURIComponent(email)}`
: '/resend-verification'

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