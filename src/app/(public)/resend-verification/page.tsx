'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resendVerificationEmail } from '@/features/auth/api/auth'
import { useAsyncAction } from '@/shared/hooks'

const schema = z.object({
  email: z.email('Please enter a valid email address')
})

type FormData = z.infer<typeof schema>

export default function ResendVerificationPage() {
  const searchParams = useSearchParams()
  const defaultEmail = useMemo(
    () => searchParams.get('email') ?? '',
    [searchParams]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail }
  })

  const { execute, isLoading, error } = useAsyncAction(async (data: FormData) => {
    await resendVerificationEmail({ email: data.email })
  })

  const emailValue = watch('email')

  return (
    <main className='min-h-screen flex items-center justify-center bg-background px-4'>
      <div className='w-full max-w-md space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold text-foreground'>Resend verification</h1>
          <p className='text-sm text-muted-foreground'>
            Enter your email to receive a new verification link.
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => execute(data))} className='space-y-4'>
          <div className='space-y-2'>
            <Input
              type='email'
              placeholder='Email address'
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className='text-xs text-destructive'>{errors.email.message}</p>
            )}
          </div>

          <Button type='submit' disabled={isLoading || !emailValue} className='w-full'>
            {isLoading ? 'Sending...' : 'Send verification email'}
          </Button>
        </form>

        {error && (
          <p className='text-xs text-destructive'>
            We could not send the email. Please try again.
          </p>
        )}

        <div className='flex flex-col gap-2 text-sm'>
          <Button asChild variant='outline'>
            <Link href='/login'>Back to login</Link>
          </Button>
          <Button asChild variant='ghost'>
            <Link href='/signup'>Create a new account</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
