'use client'

import { useState, memo, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsyncAction } from '@/shared/hooks'
// TKT-2.2.E1: `forgotPassword` was a stub in the deprecated
// `features/auth/api/auth` barrel that threw
// `forgotPassword is not implemented. Backend does not support this
// endpoint.`. The barrel is being deleted; the stub is inlined here
// so the page continues to render the existing UX (form submit
// flips to the "Check your email" success state) without depending
// on a deprecated module. When the backend eventually exposes a
// forgot-password endpoint, the body of this stub becomes a call
// to `auth.service.<new symbol>`.
async function forgotPasswordStub(_payload: { email: string }): Promise<void> {
  // Intentionally a no-op: the backend does not yet support
  // forgot-password. The page flips to its success state on the
  // awaited resolution.
  return;
}

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPasswordPage = memo(function ForgotPasswordPage() {
  const [isEmailSent, setIsEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  })

  const { execute: onSubmit, isLoading } = useAsyncAction(async (data: ForgotPasswordFormData) => {
    await forgotPasswordStub({ email: data.email })
    setIsEmailSent(true)
  })

  const { execute: handleResendEmail, isLoading: isResending } = useAsyncAction(
    async () => {
      const email = getValues('email')
      if (email) {
        await forgotPasswordStub({ email })
      }
    }
  )

  const handleOpenEmail = useCallback(() => {
    const email = getValues('email')
    if (!email) return
    window.open(`mailto:${encodeURIComponent(email)}`, '_blank')
  }, [getValues])

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-8'>
      <main className='w-full max-w-md space-y-8'>
        {/* Mobile Logo */}
        <div
          className='lg:hidden flex items-center justify-center gap-3'
          role='banner'
        >
          <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
        </div>

        {/* Back to Login */}
        <Link
          href='/login'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
          aria-label='Back to login page'
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          Back to login
        </Link>

        {!isEmailSent ? (
          <>
            {/* Header */}
            <header className='space-y-2'>
              <h2 className='text-3xl font-bold text-foreground'>
                Forgot password?
              </h2>
              <p className='text-sm text-muted-foreground'>
                No worries, we&apos;ll send you reset instructions.
              </p>
            </header>

            <section>
              {/* Forgot Password Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className='space-y-5'
                aria-label='Password reset form'
                aria-live='polite'
              >
                {/* Email Input */}
                <div className='space-y-2'>
                  <label htmlFor='email' className='sr-only'>
                    Email address
                  </label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='Email address'
                    {...register('email')}
                    className='h-12 text-primary'
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p
                      id='email-error'
                      className='text-xs text-destructive'
                      role='alert'
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type='submit'
                  disabled={isLoading}
                  size='lg'
                  className='w-full h-12 font-semibold rounded-xl'
                  aria-label={
                    isLoading ? 'Sending reset email' : 'Reset password'
                  }
                >
                  {isLoading ? (
                    <div className='flex items-center gap-2' role='status' aria-label='Sending reset email, please wait'>
                      <div
                        className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'
                        aria-hidden='true'
                      />
                      Sending...
                    </div>
                  ) : (
                    <p className='text-white'>Reset password</p>
                  )}
                </Button>
              </form>
            </section>
          </>
        ) : (
          <>
            {/* Success State */}
            <section className='space-y-2'>
              <div
                className='w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-6'
                aria-hidden='true'
              >
                <svg
                  className='w-8 h-8 text-brand'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h2 className='text-3xl font-bold text-foreground'>
                Check your email
              </h2>
              <p className='text-sm text-muted-foreground'>
                We sent a password reset link to{' '}
                <span className='font-medium text-foreground'>
                  {getValues('email')}
                </span>
              </p>
            </section>

            <div className='space-y-4'>
              {/* Open Email Button */}
              <Button
                type='button'
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
                onClick={handleOpenEmail}
                aria-label='Open email application'
              >
                <p className='text-white'>Open email app</p>
              </Button>

              {/* Resend Email */}
              <p className='text-sm text-center text-muted-foreground'>
                Didn&apos;t receive the email?{' '}
                <button
                  type='button'
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline disabled:opacity-50'
                  aria-label={
                    isResending ? 'Resending email' : 'Click to resend email'
                  }
                >
                  {isResending ? 'Resending...' : 'Click to resend'}
                </button>
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className='text-xs text-center text-muted-foreground mt-8'>
          Remember your password?{' '}
          <Link
            href='/login'
            className='text-foreground hover:text-muted-foreground transition-colors underline font-semibold'
          >
            Sign in
          </Link>
        </footer>
      </main>
    </div>
  )
})

export default ForgotPasswordPage
