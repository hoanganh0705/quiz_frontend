'use client'

import { Trophy, Target, Flame, Award } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface EmptyAchievementsProps {
  type: 'no-achievements' | 'no-badges' | 'no-streaks' | 'category-locked'
  categoryName?: string
}

export function EmptyAchievements({
  type,
  categoryName
}: EmptyAchievementsProps) {
  if (type === 'no-achievements') {
    return (
      <EmptyState
        icon={Trophy}
        title='No achievements unlocked'
        description='Start your quiz journey to unlock achievements! Complete quizzes, maintain streaks, and climb the leaderboards to earn badges and rewards.'
        size='lg'
        actions={[
          {
            label: 'Start a Quiz',
            href: '/quizzes'
          },
          {
            label: 'View All Achievements',
            href: '/achievements',
            variant: 'outline',
            icon: Trophy
          }
        ]}
      />
    )
  }

  if (type === 'no-badges') {
    return (
      <EmptyState
        icon={Award}
        title='No badges earned yet'
        description='Badges are awarded for special accomplishments. Keep playing to earn your first badge!'
        size='md'
        actions={[
          {
            label: 'How to Earn Badges',
            href: '/achievements/badges',
            icon: Award
          }
        ]}
      />
    )
  }

  if (type === 'no-streaks') {
    return (
      <EmptyState
        icon={Flame}
        title='No active streak'
        description='Complete a quiz every day to build your streak! Longer streaks unlock special rewards and achievements.'
        size='md'
        actions={[
          {
            label: 'Start Daily Challenge',
            href: '/daily-challenge',
            icon: Target
          }
        ]}
      />
    )
  }

  if (type === 'category-locked') {
    return (
      <EmptyState
        icon={Trophy}
        title={`${categoryName || 'Category'} achievements locked`}
        description={`Complete more quizzes in ${categoryName || 'this category'} to unlock these achievements.`}
        size='md'
        actions={[
          {
            label: `Browse ${categoryName || 'Category'} Quizzes`,
            href: `/categories/${categoryName?.toLowerCase().replace(/\s+/g, '-') || ''}`
          }
        ]}
      />
    )
  }

  return null
}
