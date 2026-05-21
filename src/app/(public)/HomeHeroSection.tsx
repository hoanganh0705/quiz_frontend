'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { UserAvatarDropdown } from '@/shared/ui/UserAvatarDropdown'

export function HomeHeroSection() {
  const { isAuthenticated } = useAuthState()

  return (
    <div className='relative bg-linear-to-br from-secondary to-muted rounded-xl p-6 sm:p-8 lg:p-12 mb-6 sm:mb-8 border border-border'>
      <div className='relative z-10 max-w-full sm:max-w-lg lg:max-w-2xl'>
        <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-foreground'>
          Your Quiz Adventure
          <br />
          Starts Here:
          <br />
          <span className='text-default'>Play, Share, Earn!</span>
        </h1>
        <p className='text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8'>
          Build engaging quizzes, challenge others, and earn rewards
          <br className='hidden sm:inline' />
          for your knowledge.
        </p>

        <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3'>
          <Link href='/quizzes'>
            <Button
              size='lg'
              className='text-default bg-white hover:bg-slate-50 border border-default-hover dark:text-default dark:bg-transparent dark:hover:bg-slate-700 dark:border-default-hover w-full sm:w-auto'
            >
              Play a Quiz
            </Button>
          </Link>

          {isAuthenticated ? (
            <>
              <Link href='/create-quiz'>
                <Button
                  size='lg'
                  className='text-white bg-default hover:bg-default-hover w-full sm:w-auto'
                >
                  Create Quiz
                </Button>
              </Link>
              <div className='hidden sm:block'>
                <UserAvatarDropdown variant='header' />
              </div>
            </>
          ) : (
            <div className='flex items-center gap-3'>
              <Link href='/create-quiz'>
                <Button
                  size='lg'
                  className='text-white bg-default hover:bg-default-hover w-full sm:w-auto'
                >
                  Create Quiz
                </Button>
              </Link>
              <Link href='/login'>
                <Button
                  size='lg'
                  variant='outline'
                  className='w-full sm:w-auto border-default text-default hover:bg-default hover:text-white-primary'
                >
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <p className='text-xs text-muted-foreground mt-3'>
            No login needed to start playing. Save progress later.
          </p>
        )}
      </div>

      <div className='absolute top-4 right-4 bg-default text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full transform rotate-12 text-sm sm:text-base shadow-lg'>
        <span className='font-bold'>Science Quiz</span>
      </div>
      <div className='absolute bottom-6 sm:bottom-8 right-6 sm:right-8 w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 bg-linear-to-br from-blue-400 to-purple-400 rounded-full opacity-15' />
      <div className='absolute top-1/2 right-8 sm:right-12 lg:right-16 w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 bg-yellow-300 rounded-full opacity-25' />
    </div>
  )
}
