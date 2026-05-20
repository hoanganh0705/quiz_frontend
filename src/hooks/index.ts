// Export all custom hooks from a single entry point

// Generic utility hooks (canonical location: @/shared/hooks)
export * from '@/shared/hooks'

// Page & feature hooks
export * from './use-quiz-results'
export * from './use-clipboard'
export * from './use-async-action'
export * from './use-countdown-timer'
export * from './use-loading-state'
export * from './use-bookmarks'
export * from './use-onboarding'
export * from './use-share'
export * from './use-keyboard-shortcut'
export * from './use-swipe-gesture'
export * from './use-fullscreen'
export * from './use-app-language'
export * from '@/features/auth/hooks'
