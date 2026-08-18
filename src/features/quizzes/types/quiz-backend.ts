

export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type QuizVersionStatus = 'draft' | 'published' | 'archived'

export interface QuizResponseDto {
quizId: string
creatorId: string | null
title: string
description: string | null
slug: string
requirements: string | null
imageUrl: string | null
isFeatured: boolean
isHidden: boolean
isVerified: boolean
publishedVersionId: string | null
createdAt: string
updatedAt: string
publishedVersion: QuizVersionSummaryDto | null
}

export interface QuizVersionSummaryDto {
quizVersionId: string
difficulty: QuizDifficulty
durationMs: number
rewardXp: number
passingScorePercent: number
status: QuizVersionStatus
questionCount?: number
}

export interface QuizVersionDetailDto {
quizVersionId: string
quizId: string
versionNumber: number
status: QuizVersionStatus
difficulty: QuizDifficulty
durationMs: number
passingScorePercent: number
rewardXp: number
createdByUserId: string | null
createdAt: string
publishedAt: string | null
archivedAt: string | null
updatedAt: string
questions: QuizQuestionDto[]
}

export interface QuizQuestionDto {
questionId: string
quizVersionId: string
position: number
questionText: string
imageUrl: string | null
createdAt: string
updatedAt: string
answerOptions: QuizAnswerOptionDto[]
}

export interface QuizAnswerOptionDto {
optionId: string
position: number
value: string
isCorrect: boolean // NEVER sent to client in production
}

export type QuizDifficultyLegacy = 'Easy' | 'Medium' | 'Hard'

export interface QuizListItem {
id: string
title: string
description: string
duration: number
questionCount: number
difficulty: QuizDifficultyLegacy
image: string
isFeatured: boolean
isVerified: boolean
slug: string
requirements: string
createdAt: string
updatedAt: string
reward: number

tags: string[]
categories: string[]
creator: QuizCreator | null
rating: number
isPopular: boolean
badges: string[]
}

export interface QuizCreator {
userId: string
username: string
displayName: string | null
avatarUrl: string | null
}

export interface QuizAnswerOption {
label: string
value: string
}

export interface QuizQuestion {
id: string
question: string
image: string
position: number
answers: QuizAnswerOption[]
correctAnswer?: string // Only for results/grading
}

export interface QuizDetail {
id: string
title: string
description: string
difficulty: QuizDifficultyLegacy
image: string
duration: number
passingScore: number
rewardXp: number
questions: QuizQuestion[]
creator: QuizCreator | null
createdAt: string
updatedAt: string

tags: string[]
categories: string[]
isFeatured: boolean
isVerified: boolean
rating: number
reviewCount: number
attemptCount: number
averageScore: number
badges: string[]
}

export interface QuizReview {
userId: string
username: string
displayName: string | null
avatarUrl: string | null
rating: number
comment: string
createdAt: string
}

export interface QuizLeaderboardEntry {
rank: number
userId: string
username: string
displayName: string | null
avatarUrl: string | null
score: number
timeMs: number
completedAt: string
}

export interface QuizListResponse {
items: QuizResponseDto[]
pagination: {
limit: number
nextCursor: string | null
hasNextPage: boolean
  }
}

export interface QuizVersionsResponse {
items: QuizVersionSummaryDto[]
pagination: {
limit: number
nextCursor: string | null
hasNextPage: boolean
  }
}

export function toQuizListItem(dto: QuizResponseDto): QuizListItem {
return {
id: dto.quizId,
title: dto.title,
description: dto.description ?? '',
duration: dto.publishedVersion?.durationMs ?? 0,
questionCount: dto.publishedVersion?.questionCount ?? 0,
difficulty: capitalizeDifficulty(dto.publishedVersion?.difficulty ?? 'medium'),
image: dto.imageUrl ?? '',
isFeatured: dto.isFeatured,
isVerified: dto.isVerified,
slug: dto.slug,
requirements: dto.requirements ?? '',
createdAt: dto.createdAt,
updatedAt: dto.updatedAt,
reward: dto.publishedVersion?.rewardXp ?? 0,
tags: [],
categories: [],
creator: null,
rating: 0,
isPopular: false,
badges: [],
  };
}

export function toQuizDetail(dto: QuizVersionDetailDto): QuizDetail {
return {
id: dto.quizId,
title: '',
description: '',
difficulty: capitalizeDifficulty(dto.difficulty),
image: '',
duration: dto.durationMs,
passingScore: dto.passingScorePercent,
rewardXp: dto.rewardXp,
questions: dto.questions.map(toQuizQuestion),
creator: null,
createdAt: dto.createdAt,
updatedAt: dto.updatedAt,
tags: [],
categories: [],
isFeatured: false,
isVerified: false,
rating: 0,
reviewCount: 0,
attemptCount: 0,
averageScore: 0,
badges: [],
  };
}

export function toQuizQuestion(dto: QuizQuestionDto): QuizQuestion {
return {
id: dto.questionId,
question: dto.questionText,
image: dto.imageUrl ?? '',
position: dto.position,
answers: dto.answerOptions.map((opt) => ({
label: opt.value,
value: opt.value,
    })),
  };
}

function capitalizeDifficulty(d: QuizDifficulty): QuizDifficultyLegacy {
if (d === 'easy') return 'Easy'
if (d === 'medium') return 'Medium'
if (d === 'hard') return 'Hard'
return 'Medium'
}
