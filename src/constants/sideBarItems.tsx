import {
  Home,
  Trophy,
  BookOpen,
  Compass,
  Users,
  Crown,
  MessageCircle,
  Plus,
  Settings,
  Bookmark
} from 'lucide-react'

export const sidebarItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Trophy, label: "Today's Challenge", href: '/daily-challenge' },
  { icon: BookOpen, label: 'Categories', href: '/categories' },
  { icon: Compass, label: 'Explore Quizzes', href: '/quizzes' },
  { icon: Bookmark, label: 'Saved Quizzes', href: '/bookmarks' },
  { icon: Users, label: 'Quiz Tournament', href: '/tournament' },
  { icon: Crown, label: 'Leaderboard', href: '/leaderboard' },
  { icon: MessageCircle, label: 'Quiz Discussions', href: '/discussions' },
  { icon: Plus, label: 'Create Quiz', href: '/create-quiz' },
  { icon: Settings, label: 'Settings', href: '/settings' }
]
