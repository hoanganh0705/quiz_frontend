import React, { memo } from 'react'
import { Quiz } from '@/types/quiz'
import QuizCardUnified from '@/components/QuizCardUnified'

const QuizCardDetail = memo(function QuizCardDetail(props: Quiz) {
  return <QuizCardUnified variant='detail' quiz={props} />
})

export default QuizCardDetail
