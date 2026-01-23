'use client'

import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToggle, useAsyncAction } from '@/hooks'

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

export default function SignupPage() {
  const [showPassword, toggleShowPassword] = useToggle(false)
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false)

  const {
    register,
    handleSubmit,
    control,
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('Signup attempt:', data)
    }
  )

  const handleSocialSignup = (provider: string) => {
    console.log(`Sign up with ${provider}`)
  }

  return (
    <div className='min-h-screen flex bg-background'>
      {/* Left Side - Visual */}
      <div className='hidden lg:flex lg:w-1/2 relative overflow-hidden p-2'>
        <div className='relative w-full h-full rounded-2xl overflow-hidden'>
          <Image
            src='/login.jpg'
            alt='Signup background'
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
          </div>

          <div>
            {/* Signup Form */}
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
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
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>
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
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
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
                  <div className='flex items-center gap-2'>
                    <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white' />
                    Creating account...
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
                onClick={() => handleSocialSignup('Google')}
                size='lg'
                className='h-12 rounded-xl group text-primary'
              >
                <svg className='w-5 h-5 mr-2' viewBox='0 0 24 24'>
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
                onClick={() => handleSocialSignup('Facebook')}
                size='lg'
                className='h-12 rounded-xl group text-primary'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  fill='#1877F2'
                  viewBox='0 0 24 24'
                >
                  <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
