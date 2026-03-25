'use client'

import { useMemo } from 'react'
import { useLocalStorage } from './use-local-storage'
import { defaultSettings } from '@/constants/settings'

type Translations = Record<string, Record<string, string>>

const translations: Translations = {
  en: {
    exploreQuizzes: 'Explore Quizzes',
    searchPlaceholder: 'Search quizzes, categories, creators...',
    heroTitle: 'Your Quiz Adventure Starts Here:',
    heroSubtitle: 'Build engaging quizzes, challenge others, and earn rewards for your knowledge.',
    createQuiz: 'Create Quiz',
    joinContest: 'Join Contest',
    recentlyPlayed: 'Recently Played'
  },
  vi: {
    exploreQuizzes: 'Khám Phá Quiz',
    searchPlaceholder: 'Tìm quiz, danh mục, người tạo...',
    heroTitle: 'Hành Trình Quiz Bắt Đầu Tại Đây:',
    heroSubtitle: 'Tạo quiz hấp dẫn, thách đấu bạn bè và nhận thưởng bằng kiến thức của bạn.',
    createQuiz: 'Tạo Quiz',
    joinContest: 'Tham Gia',
    recentlyPlayed: 'Đã Chơi Gần Đây'
  }
}

export function useAppLanguage() {
  const [settings] = useLocalStorage('user_settings', defaultSettings)
  const lang = settings.locale.language

  const language = useMemo(() => (lang in translations ? lang : 'en'), [lang])

  const t = (key: string, fallback: string) => {
    return translations[language]?.[key] ?? fallback
  }

  return { language, t }
}
