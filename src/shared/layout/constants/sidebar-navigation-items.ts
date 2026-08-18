import {
Home,
Trophy,
BookOpen,
Compass,
UserPlus,
Users,
Crown,
Plus,
Settings,
Bookmark,
History
} from 'lucide-react'

export const sidebarItems = [
{ icon: Home, label: 'Home', href: '/' },
{ icon: Trophy, label: "Today's Challenge", href: '/daily-challenge' },
{ icon: BookOpen, label: 'Categories', href: '/categories' },
{ icon: Compass, label: 'Explore Quizzes', href: '/quizzes' },
{ icon: UserPlus, label: 'Friends', href: '/friends' },
{ icon: Bookmark, label: 'Saved Quizzes', href: '/bookmarks' },
{ icon: History, label: 'Quiz History', href: '/quiz-history' },
{ icon: Users, label: 'Quiz Tournament', href: '/tournament' },
{ icon: Crown, label: 'Leaderboard', href: '/leaderboard' },
{ icon: Plus, label: 'Create Quiz', href: '/create-quiz' },
{ icon: Settings, label: 'Settings', href: '/settings' }
]
