/**
 * `HowItWorks` — three-step "how the platform works" explainer.
 */

import { howItWorksData } from '@/features/marketing/constants/howItWorks'
import { Layers, BrainCircuit, Trophy } from 'lucide-react'

const STEP_ICONS = [Layers, BrainCircuit, Trophy]

export default function HowItWorks() {
  return (
    <section className='rounded-2xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-5 sm:p-6 md:p-8 backdrop-blur-sm'>
      <div className='flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-6'>
        <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
          How It Works
        </h2>
        <p className='text-xs sm:text-sm text-muted-foreground mt-1.5'>
          Jump straight into competitive knowledge games or create your own in three simple steps.
        </p>
      </div>

      <div className='grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto'>
        {howItWorksData.map((item, index) => {
          const Icon = STEP_ICONS[index] ?? Layers
          return (
            <div
              key={item.id}
              className='relative flex flex-col items-start rounded-2xl border border-border/80 bg-background/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-brand/40 transition-all group'
              data-testid='how-it-works-card'
            >
              <div className='flex items-center justify-between w-full mb-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20 group-hover:scale-105 transition-transform'>
                  <Icon className='h-5 w-5' />
                </div>
                <span className='text-xl font-black text-muted-foreground/30 group-hover:text-brand/40 transition-colors'>
                  0{index + 1}
                </span>
              </div>
              <h3 className='text-sm sm:text-base font-semibold text-foreground mb-1'>
                {item.title}
              </h3>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                {item.description}
              </p>
            </div>
          )
        })}
      </div>

      <div className='flex items-center justify-center flex-col gap-3 mt-8 pt-6 border-t border-border/50 text-center'>
        <div className='inline-flex items-center gap-2 rounded-full border border-border bg-main/60 px-4 py-1.5 text-xs text-foreground shadow-2xs'>
          <span className='relative flex h-2 w-2'>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          <span>A thriving global community of quiz creators and competitors</span>
        </div>
      </div>
    </section>
  )
}
