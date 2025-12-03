import {
  Home,
  Trophy,
  BookOpen,
  Compass,
  Users,
  Crown,
  MessageCircle,
  Plus
} from 'lucide-react'

export const sidebarItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Trophy, label: "Today's Challenge", href: '/daily-challenge' },
  { icon: BookOpen, label: 'Categories', href: '/categories' },
  { icon: Compass, label: 'Explore Quizzes', href: '/quizzes' },
  { icon: Users, label: 'Quiz Tournament', href: '/tournament' },
  { icon: Crown, label: 'Leaderboard', href: '/leaderboard' },
  { icon: MessageCircle, label: 'Quiz Discussions', href: '/discussions' },
  { icon: Plus, label: 'Create Quiz', href: '/create-quiz' }
]
