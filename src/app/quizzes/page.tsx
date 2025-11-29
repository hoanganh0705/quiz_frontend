'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FeaturedQuiz from '@/components/FeaturedQuiz'
import { categories } from '@/constant/categories'
import MainContent from '@/components/quizzes/MainContent'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'

import { Search } from 'lucide-react'

export default function QuizPlatform() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2 text-foreground'>
          Explore Quizzes
        </h1>
        <p className='text-foreground/70 text-base'>
          Discover and play quizzes from our community
        </p>
      </div>

      {/* Search Bar */}
      <div className='relative mb-8 flex items-center gap-4 rounded-full'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/70 w-5 h-4 ' />
          <Input
            placeholder='Search quizzes by title, category, or creator...'
            className='pl-10 bg-transparent border-x border-gray-300 dark:border-slate-700  text-foreground placeholder:text-foreground/70 h-8 placeholder:text-sm'
          />
        </div>
      </div>

      <div className='mb-12 hidden sm:block'>
        <Swiper
          modules={[FreeMode]}
          spaceBetween={12}
          slidesPerView='auto'
          freeMode={true}
          className='category-swiper'
        >
          {categories.map((category) => (
            <SwiperSlide key={category.name} className='w-auto'>
              <Button
                className={`whitespace-nowrap rounded-full border border-gray-300 dark:border-slate-700 ${
                  category.active
                    ? 'bg-default hover:bg-default/90'
                    : 'bg-transparent hover:bg-main/90'
                }`}
              >
                <span className='mr-2'>{category.icon}</span>
                {category.name}
              </Button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <FeaturedQuiz />

      {/*Main Content */}
      <MainContent />
    </div>
  )
}
