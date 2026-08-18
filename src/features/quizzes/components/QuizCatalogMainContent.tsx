'use client'

import { memo } from 'react'

import { QuizzesDirectoryPage } from './QuizzesDirectoryPage'

interface QuizCatalogMainContentProps {
categorySlug?: string
searchQuery: string
}

const QuizCatalogMainContent = memo(function QuizCatalogMainContent({
categorySlug
  // searchQuery is intentionally destructured to acknowledge the
  // legacy API but NOT forwarded to the wire (TKT-3.5.A1 §drift #4).
}: QuizCatalogMainContentProps) {
return (
<QuizzesDirectoryPage
initialState={{
...(categorySlug !== undefined && { categoryId: categorySlug })
      }}
    />
  )
})

export default QuizCatalogMainContent
