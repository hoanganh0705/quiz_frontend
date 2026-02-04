// Main Components - Barrel export

// Core Layout Components
export { AppHeader } from './AppHeader'
export { AppSidebar } from './AppSidebar'
export { default as SideBar } from './SideBar'
export { default as SideBarDesktop } from './SideBarDesktop'
export { default as SideBarMobile } from './SideBarMobile'
export { ThemeProvider } from './theme-provider'
export { ModeToggle } from './ModeToggle'
export { NotificationDropdown } from './NotificationDropdown'

// Quiz Components
export { default as QuizCard } from './QuizCard'
export { default as QuizCardDetail } from './QuizCardDetail'
export { QuizCardDifficulty, type QuizCardProps } from './QuizCardDifficulty'
export { default as QuizCategories } from './QuizCategories'
export { default as QuizCategoriesCard } from './quizCategoriesCard'
export { default as FeaturedQuiz } from './FeaturedQuiz'
export { default as PlayQuizClient } from './PlayQuizClient'

// Leaderboard & Player Components
export { default as GlobalLeaderboard } from './GlobalLeaderBoard'
export { PlayerCard } from './PlayerCard'
export { default as LiveWinners } from './LiveWinner'

// Chart Components
export { default as ChallengeChart } from './ChallengeChart'
export { default as ChallengePieChart } from './ChallengePieChart'

// Misc Components
export { default as HowItWorks } from './HowItWorks'
export { default as SpotAvailabilityIndicator } from './SpotAvailabiltyIndicator'
export { default as StarRating } from './StarRating'
export { default as SuccessStoriesCarousel } from './SuccessStoryCarousel'

// Feature-specific Components (re-exported from subdirectories)
export * from './bookmarks'
export * from './categories'
export * from './create-quiz'
export * from './daily-challenge'
export * from './empty-states'
export * from './homepage'
export * from './leaderboard'
export * from './my-profile'
export * from './onboarding'
export * from './profile'
export * from './quiz-page'
export * from './quiz-results'
export * from './quizDetail'
export * from './quizzes'
export * from './settings'
export * from './support'
