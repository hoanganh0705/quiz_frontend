'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Autoplay, Navigation } from 'swiper/modules'
import { useRef, useState } from 'react'
import type { Swiper as SwiperType } from 'swiper'

interface CategoryCardProps {
  id: string
  name: string
  count: number
  slug: string
  imageUrl: string
}

function CategoryCard({ name, count, slug, imageUrl }: CategoryCardProps) {
  return (
    <Link
      href={`/quizzes/${slug}`}
      className='block w-full h-45 sm:h-50 overflow-hidden max-w-full min-w-0'
    >
      <div className='relative w-full h-full rounded-xl overflow-hidden shadow-lg transition-transform duration-300'>
        <Image
          src={imageUrl || '/placeholder.svg'}
          alt={`${name} Quiz Background`}
          fill
          className='object-cover'
          priority
        />
        <div className='absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent pointer-events-none' />
        <div className='absolute top-3 left-3 sm:top-4 sm:left-4 bg-gray-800/70 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium z-10'>
          {name}
        </div>
        <div className='absolute top-3 right-3 sm:top-4 sm:right-4 bg-gray-800/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium'>
          {count}
        </div>
      </div>
    </Link>
  )
}

export default function QuizCategories({
  categories
}: {
  categories: CategoryCardProps[]
}) {
  const swiperRef = useRef<SwiperType | null>(null)
  const [isBeginning, setIsBeginning] = useState(true)
  const [isEnd, setIsEnd] = useState(false)

  return (
    <div className='w-full max-w-full overflow-hidden mb-10'>
      <div className='flex items-center justify-between mb-4 sm:mb-6 px-4 sm:px-6'>
        <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
          Quiz Categories
        </h2>
        <div className='flex gap-2'>
          <Button
            size='icon'
            className='h-10 w-10'
            disabled={isBeginning}
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            size='icon'
            className='h-10 w-10'
            disabled={isEnd}
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
      <div className='w-full overflow-x-hidden px-4 sm:px-6'>
        <Swiper
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning)
            setIsEnd(swiper.isEnd)
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning)
            setIsEnd(swiper.isEnd)
          }}
          pagination={{ clickable: true }}
          modules={[Navigation, Autoplay]}
          autoplay={{
            delay: 3000,
            disableOnInteraction: true
          }}
          watchOverflow={true}
          centerInsufficientSlides={true}
          breakpoints={{
            0: {
              slidesPerView: 1,
              spaceBetween: 10
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 15
            },
            768: {
              slidesPerView: 2.5,
              spaceBetween: 20
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 25
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 30
            }
          }}
          className='w-full max-w-full'
        >
          {categories.map((category) => (
            <SwiperSlide key={category.id} className='min-w-0 max-w-full'>
              <CategoryCard
                id={category.id}
                name={category.name}
                count={category.count}
                slug={category.slug}
                imageUrl={category.imageUrl}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}
