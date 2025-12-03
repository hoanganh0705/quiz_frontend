'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { difficultyColors } from '@/constants/difficultColor'
import { QuizCardDifficulty } from '@/components/QuizCardDifficulty'
import { useState, useRef } from 'react'
import { SwiperSlide, Swiper } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import { Autoplay, Navigation } from 'swiper/modules'
import { quizzes } from '@/constants/mockQuizzes'

const QuizCardDifficultyList = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    'Easy' | 'Medium' | 'Hard'
  >('Easy')
  const [isBeginning, setIsBeginning] = useState(true)
  const [isEnd, setIsEnd] = useState(false)

  const swiperRef = useRef<SwiperType | null>(null)

  const handlePrevClick = () => {
    swiperRef.current?.slidePrev()
  }

  const handleNextClick = () => {
    swiperRef.current?.slideNext()
  }

  return (
    <div className='mt-20'>
      <div className='mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-xl font-bold text-foreground md:text-2xl'>
            Quizzes by Difficulty
          </h1>
          <p className='text-md text-gray-400 md:text-base'>
            Choose challenges according to your skill level
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex rounded-lg bg-gray-200 dark:bg-slate-800/50 p-1'>
            {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
              <Button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`rounded-sm px-4 py-1 text-sm transition ${
                  selectedDifficulty === level
                    ? `${difficultyColors[level].bg} pointer-events-none text-white dark:text-foreground`
                    : `bg-transparent text-foreground dark:text-foreground/70 ${difficultyColors[level].hover}`
                }`}
              >
                {level}
              </Button>
            ))}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              size='icon'
              onClick={handlePrevClick}
              disabled={isBeginning}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button size='icon' onClick={handleNextClick} disabled={isEnd}>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      <div className='xl:w-full container'>
        <Swiper
          spaceBetween={30}
          slidesPerView={4}
          pagination={{ clickable: true }}
          modules={[Navigation, Autoplay]}
          autoplay={{
            delay: 3000,
            disableOnInteraction: true
          }}
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning)
            setIsEnd(swiper.isEnd)
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning)
            setIsEnd(swiper.isEnd)
          }}
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
              slidesPerView: 3,
              spaceBetween: 20
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 25
            }
          }}
        >
          {quizzes
            .filter((quiz) => quiz.difficulty === selectedDifficulty)
            .map((quiz) => (
              <SwiperSlide key={quiz.id} className='w-full'>
                <QuizCardDifficulty
                  id={quiz.id}
                  imageSrc={quiz.image}
                  difficulty={quiz.difficulty}
                  authorAvatarSrc={quiz.authorAvatarSrc}
                  authorName={quiz.authorName}
                  reward={quiz.reward}
                  category={quiz.categories[0]} // Assuming the first category is used
                  duration={quiz.duration}
                  title={quiz.title}
                  players={quiz.currentPlayers}
                  spotsAvailable={quiz.spotsLeft}
                  totalSpots={quiz.spots}
                />
              </SwiperSlide>
            ))}
        </Swiper>
      </div>
    </div>
  )
}

export default QuizCardDifficultyList
