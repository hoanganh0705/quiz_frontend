

import type {
PopularQuizItemDto,
QuizListItemDto,
TrendingQuizItemDto,
} from '@/lib/api/generated/schemas'

export interface HomeRailCategory {
trendingCategoryId?: string
popularCategoryId?: string
}

export const FEATURED_RAIL_LIMIT = 6 as const

export const TRENDING_RAIL_LIMIT = 10 as const

export const POPULAR_RAIL_LIMIT = 10 as const

export type { PopularQuizItemDto, QuizListItemDto, TrendingQuizItemDto }
