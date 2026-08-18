
export interface QuizQuestion {
id: string
question: string
options: string[]
correctAnswer: number
}

export interface QuizDraft {
title: string
description: string
category: string
difficulty: string
questions: QuizQuestion[]
}
