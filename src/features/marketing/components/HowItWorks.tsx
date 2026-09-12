/**
 * `HowItWorks` — three-step "how the platform works" explainer.
 *
 * Phase 4.4 (F-8): the per-card image block (`/step1.jpg`, `/step2.jpg`,
 * `/step3.jpg`) was removed entirely — the assets never existed and
 * `next/image` was rendering broken placeholders. The card is now a
 * clean text panel with the title and description.
 */

import { howItWorksData } from '@/features/marketing/constants/howItWorks'

export default function HowItWorks() {
  return (
    <section className='bg-background mt-20 rounded-xl'>
      <div className='container p-4 md:p-6'>
        <div className='flex flex-col items-center justify-center space-y-4 text-center mt-10'>
          <div className='space-y-4'>
            <div className='inline-block rounded-lg bg-main px-3 py-1 text-sm text-foreground'>
              Simple Process
            </div>
            <h2 className='text-xl font-bold tracking-tighter sm:text-3xl text-foreground'>
              How It Works
            </h2>
            <p className='text-foreground/80 md:text-base/relaxed '>
              Getting started with our quiz platform is easy. Follow these
              simple steps to begin your quiz journey.
            </p>
          </div>
        </div>
        <div className='mx-auto grid max-w-screen-2xl items-start gap-6 py-10 px-4 lg:grid-cols-3 lg:gap-10'>
          {howItWorksData.map((item) => (
            <div
              key={item.id}
              className='bg-main border border-border rounded-2xl shadow-md overflow-hidden w-full h-full max-w-sm mx-auto p-6'
              data-testid='how-it-works-card'
            >
              <h3 className='text-lg font-semibold mb-1 text-foreground '>
                {item.title}
              </h3>
              <p className='text-base text-foreground/80'>{item.description}</p>
            </div>
          ))}
        </div>

        <div className='flex items-center justify-center flex-col space-y-4 mt-10'>
          <span className='text-foreground'>
            Ready to start your quiz journey? Browse categories, find your
            interests, and begin challenging yourself today!
          </span>

          <div className='flex justify-center items-center gap-2 bg-main px-4 py-2 rounded-xl'>
            <span className='relative flex  w-3'>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-emerald-500'></span>
            </span>
            <span className='text-foreground text-sm'>
              A growing community of quiz creators and players
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
