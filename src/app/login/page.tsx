'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-toastify'

const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  rememberMe: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('Login attempt:', data)
      toast.success('Login successful!')
    } catch {
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`)
  }

  return (
    <div className='min-h-screen flex bg-background'>
      {/* Left Side - Visual */}
      <div className='hidden lg:flex lg:w-1/2 relative overflow-hidden p-5'>
        <div className='relative w-full h-full rounded-2xl overflow-hidden'>
          <Image
            src='/login.jpg'
            alt='Login background'
            fill
            className='object-cover'
            priority
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-8'>
        <div className='w-full max-w-md'>
          {/* Mobile Logo */}
          <div className='lg:hidden flex items-center justify-center gap-3 mb-10'>
            <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
          </div>

          {/* Form Container */}
          <Card className='backdrop-blur-xl shadow-2xl border-border/50 p-5'>
            <CardHeader>
              <CardTitle className='text-2xl'>Welcome back!</CardTitle>
              <CardDescription className='text-sm'>
                New here?{' '}
                <Link
                  href='/signup'
                  className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline'
                >
                  Create an account
                </Link>
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
                {/* Email Input */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='email'
                    className='text-foreground font-medium'
                  >
                    Email address
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='you@example.com'
                    {...register('email')}
                    className='h-12'
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
                  <div className='flex items-center justify-between'>
                    <Label
                      htmlFor='password'
                      className='text-foreground font-medium'
                    >
                      Password
                    </Label>
                    <Link
                      href='/forgot-password'
                      className='text-xs text-foreground hover:text-muted-foreground font-medium transition-colors underline'
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Enter your password'
                      {...register('password')}
                      className='h-12 pr-12'
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
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

                {/* Remember Me */}
                <div className='flex items-center gap-2'>
                  <Controller
                    name='rememberMe'
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id='remember'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label
                    htmlFor='remember'
                    className='text-sm text-muted-foreground cursor-pointer select-none'
                  >
                    Keep me signed in
                  </Label>
                </div>

                {/* Login Button */}
                <Button
                  type='submit'
                  disabled={isLoading}
                  size='lg'
                  className='w-full h-12 font-semibold rounded-xl'
                >
                  {isLoading ? (
                    <div className='flex items-center gap-2'>
                      <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
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

              {/* Social Login Buttons */}
              <div className='grid grid-cols-2 gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => handleSocialLogin('Google')}
                  size='lg'
                  className='h-12 rounded-xl group'
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
                  onClick={() => handleSocialLogin('Apple')}
                  size='lg'
                  className='h-12 rounded-xl group'
                >
                  <svg
                    className='w-5 h-5 mr-2'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M17.05 20.28c-.98.95-2.05.8-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.905-.08 1.77-.65 2.95-.78 1.18-.07 2.28.26 2.8 1.63-2.8 1.74-2.28 5.4.48 6.38-.52 1.45-1.4 2.33-2.81 2.94zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z' />
                  </svg>
                  Apple
                </Button>
              </div>

              {/* Footer */}
              <p className='text-xs text-center text-muted-foreground mt-8 leading-relaxed'>
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
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
