import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'
import Link from 'next/link'
import { GoBackButton } from '../components/GoBackButton'

export default function NotFound() {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='max-w-md w-full text-center'>
        <div className='mb-8'>
          <h1 className='text-8xl font-bold text-default mb-2'>404</h1>
          <div className='w-16 h-1 bg-default mx-auto rounded-full' />
        </div>

        <h2 className='text-2xl font-bold text-foreground mb-2'>
          Page Not Found
        </h2>
        <p className='text-foreground/70 mb-8'>
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>

        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button
            asChild
            className='bg-default hover:bg-default-hover text-white'
          >
            <Link href='/'>
              <Home className='w-4 h-4 mr-2' />
              Go Home
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            className='border-gray-300 dark:border-slate-700 text-primary'
          >
            <Link href='/quizzes'>
              <Search className='w-4 h-4 mr-2' />
              Explore Quizzes
            </Link>
          </Button>
        </div>

        <GoBackButton />
      </div>
    </div>
  )
}
