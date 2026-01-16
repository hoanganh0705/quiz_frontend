'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='max-w-md w-full text-center'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6'>
          <AlertTriangle className='w-8 h-8 text-red-600 dark:text-red-400' />
        </div>

        <h1 className='text-2xl font-bold text-foreground mb-2'>
          Something went wrong!
        </h1>
        <p className='text-foreground/70 mb-8'>
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>

        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button
            onClick={reset}
            className='bg-default hover:bg-default-hover text-white'
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            Try Again
          </Button>
          <Button
            asChild
            variant='outline'
            className='border-gray-300 dark:border-slate-700'
          >
            <Link href='/'>
              <Home className='w-4 h-4 mr-2' />
              Go Home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className='mt-6 text-xs text-foreground/50'>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
