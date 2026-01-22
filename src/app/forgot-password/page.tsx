'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
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

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('Password reset request:', data)
      setIsEmailSent(true)
    } catch {
      // Handle error
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } catch {
      // Handle error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-8'>
      <div className='w-full max-w-md space-y-8'>
        {/* Mobile Logo */}
        <div className='lg:hidden flex items-center justify-center gap-3'>
          <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
        </div>

        {/* Back to Login */}
        <Link
          href='/login'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to login
        </Link>

        {!isEmailSent ? (
          <>
            {/* Header */}
            <div className='space-y-2'>
              <h2 className='text-3xl font-bold text-foreground'>
                Forgot password?
              </h2>
              <p className='text-sm text-muted-foreground'>
                No worries, we&apos;ll send you reset instructions.
              </p>
            </div>

            <div>
              {/* Forgot Password Form */}
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
                {/* Email Input */}
                <div className='space-y-2'>
                  <Input
                    id='email'
                    type='email'
                    placeholder='Email address'
                    {...register('email')}
                    className='h-12 text-primary'
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className='text-xs text-destructive'>
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
                >
                  {isLoading ? (
                    <div className='flex items-center gap-2'>
                      <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white' />
                      Sending...
                    </div>
                  ) : (
                    <p className='text-white'>Reset password</p>
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className='space-y-2'>
              <div className='w-16 h-16 bg-default/10 rounded-full flex items-center justify-center mb-6'>
                <svg
                  className='w-8 h-8 text-default'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
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
            </div>

            <div className='space-y-4'>
              {/* Open Email Button */}
              <Button
                type='button'
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
                onClick={() => window.open('mailto:', '_blank')}
              >
                <p className='text-white'>Open email app</p>
              </Button>

              {/* Resend Email */}
              <p className='text-sm text-center text-muted-foreground'>
                Didn&apos;t receive the email?{' '}
                <button
                  type='button'
                  onClick={handleResendEmail}
                  disabled={isLoading}
                  className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline disabled:opacity-50'
                >
                  {isLoading ? 'Resending...' : 'Click to resend'}
                </button>
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <p className='text-xs text-center text-muted-foreground mt-8'>
          Remember your password?{' '}
          <Link
            href='/login'
            className='text-foreground hover:text-muted-foreground transition-colors underline font-semibold'
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
