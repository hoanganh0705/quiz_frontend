'use client'

import { memo, useMemo, useState, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import Link from 'next/link'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToggle, useAsyncAction } from '@/shared/hooks'
import { useAuthState } from '@/features/auth/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginUser, getSocialAuthUrl } from '@/features/auth/api/auth'
import { setAuthToken } from '@/features/auth/utils/auth-cookies'
import axios from 'axios'
import { useFetchCurrentUser } from '@/features/users/store/user-store'
import type { SocialProvider } from '@/features/auth/types'

// Hoist schema outside component (data-hoisting)
const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  rememberMe: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage = memo(function LoginPage() {
  const [showPassword, toggleShowPassword] = useToggle(false)
  const { setAuthenticated } = useAuthState()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifyBanner, setVerifyBanner] = useState<string | null>(null)
  const fetchCurrentUser = useFetchCurrentUser()

  const redirectTo = useMemo(
    () => searchParams.get('redirect') ?? '/quizzes',
    [searchParams]
  )
  const verifiedParam = useMemo(
    () => searchParams.get('verified') === '1',
    [searchParams]
  )
  const showVerifiedToast = verifiedParam

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const { execute: onSubmit, isLoading } = useAsyncAction(
    async (data: LoginFormData) => {
      setVerifyBanner(null)
      try {
        const response = await loginUser({
          email: data.email,
          password: data.password
        })
        const cookieDays = data.rememberMe ? 30 : 7
        setAuthToken(response.token.accessToken, { days: cookieDays })
        setAuthenticated(true)
        void fetchCurrentUser()
        router.replace(redirectTo)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message =
            (err.response?.data as { message?: string })?.message ?? ''
          if (/verify|verified|verification/i.test(message)) {
            setVerifyBanner(
              'Your email is not verified yet. Please check your inbox or resend the link.'
            )
          }
        }
        throw err
      }
    }
  )

  const { execute: handleSocialLogin, isLoading: isSocialLoading, error: socialError } = useAsyncAction(
    async (provider: SocialProvider) => {
      const response = await getSocialAuthUrl(provider)
      window.location.href = response.url
    }
  )

  return (
    <div className='min-h-screen flex bg-background'>
      {/* Left Side - Visual */}
      <aside
        className='hidden lg:flex lg:w-1/2 relative overflow-hidden p-2'
        aria-label='Login background'
      >
        <div className='relative w-full h-full rounded-2xl overflow-hidden'>
          <Image
            src='/login.jpg'
            alt='Login background'
            fill
            className='object-cover'
            priority
          />
        </div>
      </aside>

      {/* Right Side - Login Form */}
      <main className='w-full lg:w-1/2 flex items-center justify-center px-8'>
        <div className='w-full max-w-md space-y-8'>
          {/* Mobile Logo */}
          <div className='lg:hidden flex items-center justify-center gap-3'>
            <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
          </div>

          {/* Header */}
          <header className='space-y-10'>
            <h2 className='text-3xl font-bold text-foreground space-y-10'>
              Welcome back!
            </h2>
            <p className='text-xs text-muted-foreground'>
              New here?{' '}
              <Link
                href='/signup'
                className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline'
              >
                Create an account
              </Link>
            </p>
          </header>

          <section aria-label='Login form'>
            {showVerifiedToast && (
              <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700'>
                Email verified successfully. You can now sign in.
              </div>
            )}

            {verifyBanner && (
              <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700'>
                {verifyBanner}
              </div>
            )}

            {socialError && (
              <div className='rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive' role='alert'>
                {socialError.message || 'Failed to initiate social login. Please try again.'}
              </div>
            )}

            {/* Login Form */}
            <form
              onSubmit={handleSubmit((data) => onSubmit(data))}
              className='space-y-5'
              aria-label='Sign in to your account'
              aria-live='polite'
            >
              {/* Email Input */}
              <div className='space-y-2'>
                <Input
                  id='email'
                  type='email'
                  placeholder='Email address'
                  {...register('email')}
                  className='h-12 text-primary'
                  aria-invalid={!!errors.email}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className='text-xs text-destructive'>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Enter your password'
                    {...register('password')}
                    className='h-12 pr-12 text-primary'
                    aria-invalid={!!errors.password}
                    disabled={isLoading}
                  />
                  <button
                    type='button'
                    onClick={toggleShowPassword}
                    disabled={isLoading}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className='w-5 h-5' aria-hidden='true' />
                    ) : (
                      <Eye className='w-5 h-5' aria-hidden='true' />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className='text-xs text-destructive'>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Controller
                    name='rememberMe'
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id='remember'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='text-brand'
                        disabled={isLoading}
                      />
                    )}
                  />
                  <Label
                    htmlFor='remember'
                    className='text-xs text-muted-foreground cursor-pointer select-none'
                  >
                    Keep me signed in
                  </Label>
                </div>
                <Link
                  href='/forgot-password'
                  className='text-xs text-foreground hover:text-muted-foreground font-medium transition-colors underline'
                >
                  Forgot password?
                </Link>
              </div>

              <div className='text-xs text-muted-foreground'>
                Need a new verification link?{' '}
                <Link
                  href='/resend-verification'
                  className='text-foreground hover:text-muted-foreground font-medium transition-colors underline'
                >
                  Resend verification email
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type='submit'
                disabled={isLoading}
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
              >
                {isLoading ? (
                  <div className='flex items-center gap-2' role='status' aria-label='Signing in, please wait'>
                    <div
                      className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'
                      aria-hidden='true'
                    />
                    Signing in...
                  </div>
                ) : (
                  <p className='text-white'>Sign in</p>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div
              className='flex items-center gap-4 my-6'
              role='separator'
              aria-label='Or sign in with'
            >
              <div className='flex-1 h-px bg-border' aria-hidden='true' />
              <span className='text-xs text-muted-foreground font-medium'>
                OR
              </span>
              <div className='flex-1 h-px bg-border' aria-hidden='true' />
            </div>

            {/* Social Login Buttons */}
            <div
              className='grid grid-cols-2 gap-4'
              role='group'
              aria-label='Social login options'
            >
              <Button
                type='button'
                variant='outline'
                onClick={() => handleSocialLogin('google')}
                disabled={isSocialLoading}
                size='lg'
                className='h-12 rounded-xl group text-primary'
                aria-label='Sign in with Google'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  viewBox='0 0 24 24'
                  aria-hidden='true'
                >
                  <path
                    fill='#4285F4'
                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  />
                  <path
                    fill='#34A853'
                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  />
                  <path
                    fill='#EA4335'
                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  />
                </svg>
                Google
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleSocialLogin('github')}
                disabled={isSocialLoading}
                size='lg'
                className='h-12 rounded-xl group text-primary'
                aria-label='Sign in with GitHub'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                  aria-hidden='true'
                >
                  <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                </svg>
                GitHub
              </Button>
            </div>

            {/* Footer */}
            <footer className='text-xs text-center text-muted-foreground mt-8 leading-relaxed'>
              By signing in, you agree to our{' '}
              <Link
                href='/terms'
                className='text-foreground hover:text-muted-foreground transition-colors underline'
              >
                Terms
              </Link>
              {' & '}
              <Link
                href='/privacy'
                className='text-foreground hover:text-muted-foreground transition-colors underline'
              >
                Privacy Policy
              </Link>
            </footer>
          </section>
        </div>
      </main>
    </div>
  )
})

export default LoginPage
