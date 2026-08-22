'use client'

import { memo } from 'react'

import { QuizzesDirectoryPage } from './QuizzesDirectoryPage'

interface QuizCatalogMainContentProps {
  categorySlug?: string
}

const QuizCatalogMainContent = memo(function QuizCatalogMainContent({
  categorySlug,
}: QuizCatalogMainContentProps) {
  return (
    <QuizzesDirectoryPage
      initialState={{
        ...(categorySlug !== undefined && { categoryId: categorySlug }),
      }}
    />
  )
})

export default QuizCatalogMainContent