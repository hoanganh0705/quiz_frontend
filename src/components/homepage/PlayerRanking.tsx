'use client'

import { ChevronLeft, ChevronRight, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'

import { PlayerCard } from '../PlayerCard'
import { players } from '@/constant/players'

const PlayerRanking = () => {
  return (
    <div className='xl:py-10 bg-main p-6 text-foreground rounded-xl'>
      <div className='mb-10 flex items-center justify-between'>
        <h2 className='flex items-center gap-2 text-2xl font-bold'>
          <Swords className='h-6 w-6' />
          Top Players
        </h2>
        <div className='flex gap-2'>
          <Button
            size='icon'
            className='bg-default text-white hover:bg-default-hover player-swiper-button-prev'
          >
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <Button
            size='icon'
            className='bg-default text-white hover:bg-default-hover player-swiper-button-next'
          >
            <ChevronRight className='h-5 w-5' />
          </Button>
        </div>
      </div>

      <div className='xl:w-[100%] container'>
        <Swiper
          pagination={{ clickable: true }}
          modules={[Navigation, Autoplay]}
          autoplay={{
            delay: 3000,
            disableOnInteraction: true
          }}
          navigation={{
            prevEl: '.player-swiper-button-prev',
            nextEl: '.player-swiper-button-next'
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
          {players.map((player, index) => (
            <SwiperSlide key={index} className='w-full'>
              <PlayerCard {...player} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className='mt-8 flex justify-center'>
        <Button className='rounded-md text-white bg-default hover:bg-default-hover'>
          View Full Leaderboard
        </Button>
      </div>
    </div>
  )
}

export default PlayerRanking
