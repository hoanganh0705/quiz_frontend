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
import { getPasswordStrength } from '@/features/auth/utils/password-strength'
import { register as registerUser } from '@/features/auth/wrappers/auth.wrapper'

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
              aria-label='Create a new account'
              aria-live='polite'
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
                              ? 'bg-brand'
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
                        className='text-brand mt-0.5'
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
          </div>
        </div>
      </div>
    </main>
  )
})

export default SignupPage
