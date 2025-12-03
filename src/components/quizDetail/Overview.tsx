import React from 'react'
import { Button } from '../ui/button'
import { formatDuration } from '@/lib/formatDuration'
import { quizzes } from '@/constants/mockQuizzes'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { difficultyColors } from '@/constants/difficultColor'

const Overview = ({
  description,
  requirements,
  duration,
  tags
}: {
  description: string
  requirements: string
  duration: number
  tags: string[]
}) => {
  return (
    <div className='space-y-6 text-foreground'>
      <div>
        <h2 className='text-xl font-bold mb-4'>Description</h2>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          {description}
        </p>
      </div>

      <div>
        <h2 className='text-xl font-bold mb-4'>Requirements</h2>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          {requirements}
        </p>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          Completion time: {formatDuration(duration)}
        </p>
      </div>

      <div className='max-w-6xl mx-auto'>
        {/* Tags Section */}
        <div className='mb-8'>
          <h2 className='text-2xl font-bold mb-4'>Tags</h2>
          <div className='flex flex-wrap gap-3'>
            {tags?.map((tag) => (
              <Button
                key={tag}
                variant='outline'
                className='border-slate-600 text-foreground dark:hover:bg-slate-700 dark:hover:text-white bg-transparent px-2 py-1 h-auto leading-none'
              >
                <span className='text-xs'>{tag}</span>
              </Button>
            ))}
          </div>

          {/* Related Quizzes Section ( do it later)*/}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className='relative group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105'
          >
            {/* Background Image */}
            <div className='relative h-32 w-full'>
              <Image
                src={quiz.image || '/placeholder.svg'}
                alt={quiz.title}
                fill
                className='object-cover'
              />
              {/* Overlay */}
              <div className='absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors' />
            </div>

            {/* Content */}
            <div className='absolute inset-0 flex flex-col justify-between p-4'>
              {/* Difficulty Badge */}
              <div className='flex justify-start'>
                <Badge
                  className={`${
                    difficultyColors[quiz.difficulty].bg
                  } text-white text-xs px-2 py-1 font-medium`}
                >
                  {quiz.difficulty}
                </Badge>
              </div>

              {/* Title */}
              <div className='flex-1 flex items-end'>
                <h3 className='text-white font-semibold text-sm leading-tight'>
                  {quiz.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Overview
