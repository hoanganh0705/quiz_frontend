'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import { testimonials } from '@/constant/testimonial'

export default function SuccessStoriesCarousel() {
  return (
    <section className='w-full py-12 mt-10 rounded-xl text-foreground bg-main'>
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col items-center justify-center space-y-4 text-center'>
          <div className='space-y-2'>
            <h2 className='text-3xl font-bold text-foreground mb-4'>
              Success Stories
            </h2>
            <p className='text-foreground/80 text-lg max-w-2xl mx-auto'>
              Hear from our community of quiz creators and players who are
              earning rewards and building their audience
            </p>
          </div>
        </div>

        <div className='relative mt-12'>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            navigation={{
              prevEl: '.swiper-button-prev-custom',
              nextEl: '.swiper-button-next-custom'
            }}
            pagination={{
              el: '.swiper-pagination-custom',
              clickable: true,
              bulletClass: 'swiper-pagination-bullet-custom',
              bulletActiveClass: 'swiper-pagination-bullet-active-custom'
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false
            }}
            loop={true}
            className='testimonial-swiper'
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={index}>
                <div className='relative w-full max-w-4xl mx-auto rounded-xl p-6 md:p-12'>
                  <div className='flex flex-col items-center md:flex-row md:items-start md:space-x-8'>
                    <div className='relative mb-6 md:mb-0'>
                      <Image
                        src={testimonial.avatar || '/placeholder.svg'}
                        alt={testimonial.name}
                        width={120}
                        height={120}
                        className='rounded-full object-cover border-4 border-[#4a4a6a]'
                      />
                    </div>
                    <div className='flex-1 text-center md:text-left'>
                      <div className='flex justify-center md:justify-start mb-2'>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < testimonial.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                      <p className='text-lg italic text-foreground/80 mb-4'>
                        {testimonial.quote}
                      </p>
                      <h3 className='text-xl font-semibold text-foreground'>
                        {testimonial.name}
                      </h3>
                      <p className='text-gray-400'>{testimonial.role}</p>
                      <div className='mt-6 flex justify-center md:justify-start space-x-8'>
                        <div className='text-center'>
                          <div className='text-2xl font-bold text-foreground'>
                            {testimonial.earnings}
                          </div>
                          <div className='text-gray-400 text-sm'>Earnings</div>
                        </div>
                        <div className='text-center'>
                          <div className='text-2xl font-bold text-default'>
                            {testimonial.quizzes}
                          </div>
                          <div className='text-gray-400 text-sm'>Quizzes</div>
                        </div>
                        <div className='text-center'>
                          <div className='text-2xl font-bold text-default'>
                            {testimonial.followers}
                          </div>
                          <div className='text-gray-400 text-sm'>Followers</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Buttons */}
          <button
            className='swiper-button-prev-custom absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-default hover:bg-default-hover text-white flex items-center justify-center transition-colors hover:cursor-pointer'
            aria-label='Previous testimonial'
          >
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>

          <button
            className='swiper-button-next-custom absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-default hover:bg-default-hover text-white flex items-center justify-center transition-colors hover:cursor-pointer'
            aria-label='Next testimonial'
          >
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </button>

          {/* Custom Pagination */}
          <div className='swiper-pagination-custom mt-8 flex justify-center space-x-2'></div>
        </div>
      </div>

      <style jsx global>{`
        .testimonial-swiper {
          overflow: visible;
        }

        .swiper-pagination-bullet-custom {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgb(107, 114, 128);
          opacity: 1;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .swiper-pagination-bullet-active-custom {
          background-color: #6c88ea;
        }

        .swiper-pagination-bullet-custom:hover {
          background-color: rgb(156, 163, 175);
        }

        .swiper-pagination-bullet-active-custom:hover {
          background-color: rgb(243, 244, 246);
        }
      `}</style>
    </section>
  )
}
