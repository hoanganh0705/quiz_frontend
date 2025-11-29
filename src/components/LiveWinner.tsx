'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { winners } from '@/constant/liveWinner'
import { Autoplay, Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

export default function LiveWinners() {
  return (
    <div className='mt-20 bg-main p-5 rounded-xl'>
      <div className='text-foreground '>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl md:text-2xl font-bold flex items-center gap-3'>
            <span className='relative flex h-3 w-3'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-emerald-500'></span>
            </span>
            Live Winners
          </h2>
          <Button
            variant='ghost'
            className='rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm'
          >
            8 recent winners
          </Button>
        </div>

        <div className='xl:w-full container'>
          <Swiper
            modules={[Navigation, Autoplay]}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }}
            breakpoints={{
              // Mobile: auto 1 slide
              0: {
                slidesPerView: 1,
                spaceBetween: 10
              },
              // Tablet
              640: {
                slidesPerView: 2,
                spaceBetween: 15
              },
              // Tablet lớn / Laptop nhỏ
              768: {
                slidesPerView: 3,
                spaceBetween: 20
              },
              // Laptop
              1024: {
                slidesPerView: 4,
                spaceBetween: 25
              },
              // Desktop lớn
              1280: {
                slidesPerView: 5,
                spaceBetween: 30
              }
            }}
          >
            {winners.map((winner) => (
              <SwiperSlide
                key={winner.id}
                className='shrink-0 px-3 relative overflow-hidden dark:bg-slate-900 bg-[#e2e8f0] border border-gray-300 dark:border-slate-700 rounded-lg p-4 shadow-lg flex flex-col items-center text-center w-full'
              >
                <div className='flex items-center justify-between mb-4 w-full flex-row-reverse'>
                  <div className='text-2xl' aria-label='Confetti popper'>
                    🎉
                  </div>
                  <div className='flex items-center gap-4 mb-4'>
                    <Avatar className='w-12 h-12 border-2 border-white'>
                      <AvatarImage
                        src={winner.avatarUrl || '/placeholder.svg'}
                        alt={winner.name}
                      />
                      <AvatarFallback>{winner.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className='font-semibold text-lg'>{winner.name}</p>
                      <p className='text-gray-400 text-sm'>{winner.timeAgo}</p>
                    </div>
                  </div>
                </div>
                <div className=' text-sm truncate'>
                  <span role='img' aria-label='Money bag'>
                    💰
                  </span>
                  Won{' '}
                  <span className='text-emerald-400 font-semibold'>
                    ${winner.amountWon}
                  </span>{' '}
                  playing &quot;
                  {winner.game}&quot;
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  )
}
