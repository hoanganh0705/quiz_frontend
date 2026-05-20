'use client'

import { memo, useMemo } from 'react'
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
import { useRouter } from 'next/navigation'
import { registerUser, getSocialAuthUrl } from '@/features/auth/api/auth'
import type { SocialProvider } from '@/features/auth/types'

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.email('Please enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must be less than 100 characters'),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions'
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  })

type SignupFormData = z.infer<typeof signupSchema>

function getPasswordStrength(password: string) {
  if (!password) {
    return {
      score: 0,
      label: 'Too weak',
      checks: {
        minLength: false,
        uppercase: false,
        number: false,
        symbol: false
      }
    }
  }

  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  }

  const score = Object.values(checks).filter(Boolean).length
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

  return {
    score,
    label: labels[score],
    checks
  }
}

const SignupPage = memo(function SignupPage() {
  const [showPassword, toggleShowPassword] = useToggle(false)
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false)
  const { setAuthenticated } = useAuthState()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    }
  })

  const { execute: onSubmit, isLoading } = useAsyncAction(
    async (data: SignupFormData) => {
      const rawUsername = `${data.firstName}.${data.lastName}`
      const username = rawUsername
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 50)

      await registerUser({
        username: username || data.email.split('@')[0],
        email: data.email,
        password: data.password
      })

      setAuthenticated(false)
      router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`)
    }
  )

  const { execute: handleSocialSignup, isLoading: isSocialLoading } = useAsyncAction(
    async (provider: SocialProvider) => {
      try {
        const response = await getSocialAuthUrl(provider)
        window.location.href = response.url
      } catch {
        // Handle error silently or show toast
      }
    }
  )

  const passwordValue = watch('password')
  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordValue ?? ''),
    [passwordValue]
  )

  return (
    <main className='min-h-screen flex bg-background'>
      {/* Left Side - Visual */}
      <div className='hidden lg:flex lg:w-1/2 relative overflow-hidden p-2'>
        <div className='relative w-full h-full rounded-2xl overflow-hidden'>
          <Image
            src='/login.jpg'
            alt='QuizHub signup - Join our community of quiz enthusiasts'
            fill
            className='object-cover'
            priority
          />
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-8 py-12'>
        <div className='w-full max-w-md space-y-10'>
          {/* Mobile Logo */}
          <div className='lg:hidden flex items-center justify-center gap-3'>
            <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
          </div>

          {/* Header */}
          <div className='space-y-10'>
            <h2 className='text-3xl font-bold text-foreground'>
              Create your account
            </h2>
            <p className='text-sm text-muted-foreground'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline'
              >
                Sign in
              </Link>
            </p>
            <p className='text-xs text-muted-foreground'>
              After signing up, we will email you a verification link.{' '}
              <Link
                href='/resend-verification'
                className='text-foreground hover:text-muted-foreground font-medium transition-colors underline'
              >
                Resend verification email
              </Link>
            </p>
          </div>

          <div>
            {/* Signup Form */}
            <form
              onSubmit={handleSubmit((data) => onSubmit(data))}
              className='space-y-5'
            >
              {/* First Name and Last Name */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Input
                    id='firstName'
                    type='text'
                    placeholder='First name'
                    {...register('firstName')}
                    className='h-12 text-primary'
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && (
                    <p className='text-xs text-destructive'>
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Input
                    id='lastName'
                    type='text'
                    placeholder='Last name'
                    {...register('lastName')}
                    className='h-12 text-primary'
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && (
                    <p className='text-xs text-destructive'>
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

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

              {/* Password Input */}
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Create password'
                    {...register('password')}
                    className='h-12 pr-12 text-primary'
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type='button'
                    onClick={toggleShowPassword}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
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
                {passwordValue && (
                  <div className='space-y-2' aria-live='polite'>
                    <div
                      className='grid grid-cols-4 gap-1'
                      role='progressbar'
                      aria-label='Password strength'
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-valuenow={passwordStrength.score}
                    >
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full ${
                            index < passwordStrength.score
                              ? 'bg-default'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Strength: {passwordStrength.label}
                    </p>
                    <ul className='grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                      <li>
                        {passwordStrength.checks.minLength ? '✓' : '•'} 8+
                        characters
                      </li>
                      <li>
                        {passwordStrength.checks.uppercase ? '✓' : '•'}
                        uppercase letter
                      </li>
                      <li>
                        {passwordStrength.checks.number ? '✓' : '•'} number
                      </li>
                      <li>
                        {passwordStrength.checks.symbol ? '✓' : '•'} symbol
                      </li>
                    </ul>
                  </div>
                )}
                {errors.password && (
                  <p className='text-xs text-destructive'>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    id='confirmPassword'
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder='Confirm password'
                    {...register('confirmPassword')}
                    className='h-12 pr-12 text-primary'
                    aria-invalid={!!errors.confirmPassword}
                  />
                  <button
                    type='button'
                    onClick={toggleShowConfirmPassword}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-5 h-5' aria-hidden='true' />
                    ) : (
                      <Eye className='w-5 h-5' aria-hidden='true' />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className='text-xs text-destructive'>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className='space-y-2'>
                <div className='flex items-start gap-2'>
                  <Controller
                    name='agreeToTerms'
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id='terms'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='text-default mt-0.5'
                      />
                    )}
                  />
                  <Label
                    htmlFor='terms'
                    className='text-xs text-muted-foreground cursor-pointer select-none leading-relaxed'
                  >
                    I agree to the{' '}
                    <Link
                      href='/terms'
                      className='text-foreground hover:text-muted-foreground transition-colors underline'
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href='/privacy'
                      className='text-foreground hover:text-muted-foreground transition-colors underline'
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className='text-xs text-destructive'>
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>

              {/* Signup Button */}
              <Button
                type='submit'
                disabled={isLoading}
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
              >
                {isLoading ? (
                  <div
                    className='flex items-center gap-2'
                    role='status'
                    aria-live='polite'
                  >
                    <div
                      className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white'
                      aria-hidden='true'
                    />
                    Creating account…
                  </div>
                ) : (
                  <p className='text-white'>Create account</p>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className='flex items-center gap-4 my-6'>
              <div className='flex-1 h-px bg-border' />
              <span className='text-xs text-muted-foreground font-medium'>
                OR
              </span>
              <div className='flex-1 h-px bg-border' />
            </div>

            {/* Social Signup Buttons */}
            <div className='grid grid-cols-2 gap-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleSocialSignup('google')}
                disabled={isSocialLoading}
                size='lg'
                className='h-12 rounded-xl group text-primary'
                aria-label='Sign up with Google'
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
                onClick={() => handleSocialSignup('github')}
                disabled={isSocialLoading}
                size='lg'
                className='h-12 rounded-xl group text-primary'
                aria-label='Sign up with GitHub'
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
          </div>
        </div>
      </div>
    </main>
  )
})

export default SignupPage
