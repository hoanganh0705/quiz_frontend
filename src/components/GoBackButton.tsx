'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function GoBackButton() {
  const router = useRouter()

  return (
    <div className='mt-8'>
      <button
        onClick={() => router.back()}
        className='inline-flex items-center text-sm text-foreground/70 hover:text-foreground transition-colors'
      >
        <ArrowLeft className='w-4 h-4 mr-1' />
        Go back to previous page
      </button>
    </div>
  )
}
