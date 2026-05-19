'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { verifyEmail } from '@/lib/api/auth'
import { useAsyncAction } from '@/hooks'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const email = useMemo(() => searchParams.get('email') ?? '', [searchParams])

  const {
    execute: runVerify,
    isLoading,
    error
  } = useAsyncAction(async () => {
    if (!token) return
    await verifyEmail({ token })
  })

  useEffect(() => {
    if (!token) return
    runVerify()
  }, [runVerify, token])

  const title = token
    ? isLoading
      ? 'Verifying your email'
      : error
        ? 'Verification failed'
        : 'Email verified'
    : 'Check your inbox'

  const description = token
    ? isLoading
      ? 'Hang tight while we confirm your email address.'
      : error
        ? 'The verification link is invalid or expired.'
        : 'Your email is confirmed. You can now sign in.'
    : 'Click the link in your email to verify your account.'

  return (
    <main className='min-h-screen flex items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold text-foreground'>{title}</h1>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>

        {!token && (
          <div className='text-xs text-muted-foreground'>
            {email
              ? `We sent a verification link to ${email}.`
              : 'Need a new link?'}
          </div>
        )}

        <div className='flex flex-col gap-3'>
          {token && error && (
            <Button onClick={() => runVerify()} variant='outline'>
              Try again
            </Button>
          )}
          <Button asChild>
            <Link href='/login'>Go to login</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link
              href={
                email
                  ? `/resend-verification?email=${encodeURIComponent(email)}`
                  : '/resend-verification'
              }
            >
              Resend verification email
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
