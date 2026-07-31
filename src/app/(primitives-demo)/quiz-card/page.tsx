/**
 * Static demo route for Story 3.1 design-system primitives.
 *
 * Source ticket: TKT-3.1.B2.
 *
 * Renders an in-memory grid of 12 mock QuizListItemDto rows as a stand-in
 * for the live <QuizCard /> primitive that Batch C will implement. A
 * skeleton/resolved toggle lets us visually verify the no-CLS behaviour
 * that Story 3.1's exit criteria require.
 *
 * This page issues zero network requests and is excluded from the
 * sitemap/robots index. It exists only as a Lighthouse + visual review
 * surface for the Phase 3 primitives track.
 */

import type { Metadata } from 'next'

import { QuizCardDemo } from './QuizCardDemo'

export const metadata: Metadata = {
  title: 'QuizCard primitive demo (internal)',
  description: 'Internal Story 3.1 verification surface — do not index.',
  robots: { index: false, follow: false }
}

export default function QuizCardDemoPage() {
  return (
    <main id='main-content' className='container mx-auto px-4 py-8'>
      <header className='mb-6 space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          QuizCard primitive demo
        </h1>
        <p className='text-sm text-muted-foreground'>
          Internal verification surface for Story 3.1. Toggle between
          skeleton and resolved states to confirm no CLS during hydration.
        </p>
      </header>
      <QuizCardDemo />
    </main>
  )
}