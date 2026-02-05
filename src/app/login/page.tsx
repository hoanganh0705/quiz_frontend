'use client'

import { memo, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'
// Fix barrel imports (bundle-barrel-imports)
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

// Hoist schema outside component (data-hoisting)
const loginSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const { execute: onSubmit, isLoading } = useAsyncAction(
    async (data: LoginFormData) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('Login attempt:', data)
    }
  )

  // Use useCallback for event handlers (rerender-functional-setstate)
  const handleSocialLogin = useCallback((provider: string) => {
    console.log(`Login with ${provider}`)
  }, [])

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
            {/* Login Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='space-y-5'
              aria-label='Sign in to your account'
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
                        className='text-default'
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

              {/* Login Button */}
              <Button
                type='submit'
                disabled={isLoading}
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
                aria-label={isLoading ? 'Signing in' : 'Sign in'}
              >
                {isLoading ? (
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white'
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
                onClick={() => handleSocialLogin('Google')}
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
                onClick={() => handleSocialLogin('Facebook')}
                size='lg'
                className='h-12 rounded-xl group text-primary'
                aria-label='Sign in with Facebook'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  fill='#1877F2'
                  viewBox='0 0 24 24'
                  aria-hidden='true'
                >
                  <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                </svg>
                Facebook
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
