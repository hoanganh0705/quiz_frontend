import { Article } from '@/types/articles'
import {
  BookOpen,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings
} from 'lucide-react'

export const articles: Article[] = [
  {
    id: '1',
    category: 'General',
    title: 'Getting Started with QuizHub',
    description:
      'Everything you need to know to begin your journey on our platform.',
    readTime: '5 min read',
    icon: BookOpen,
    slug: 'getting-started-with-quizhub',
    content: 'Complete guide to getting started...',
    tags: ['beginner', 'setup', 'introduction'],
    lastUpdated: '2024-01-15',
    difficulty: 'Beginner'
  },
  {
    id: '2',
    category: 'Account',
    title: 'Complete Account Setup Guide',
    description:
      'Learn how to set up your account, customize your profile, and configure your preferences.',
    readTime: '5 min read',
    icon: User,
    slug: 'complete-account-setup-guide',
    content: 'Step-by-step account setup instructions...',
    tags: ['account', 'profile', 'settings'],
    lastUpdated: '2024-01-12',
    difficulty: 'Beginner'
  },
  {
    id: '3',
    category: 'Billing',
    title: 'Managing Your Subscription',
    description:
      'Learn how to upgrade, downgrade, or cancel your subscription plan.',
    readTime: '4 min read',
    icon: CreditCard,
    slug: 'managing-your-subscription',
    content: 'Comprehensive billing and subscription management...',
    tags: ['billing', 'subscription', 'payment'],
    lastUpdated: '2024-01-10',
    difficulty: 'Beginner'
  },
  {
    id: '4',
    category: 'Quiz creation',
    title: 'Quiz Creation Basics',
    description:
      'A step-by-step guide to creating your first quiz from scratch.',
    readTime: '5 min read',
    icon: PlusCircle,
    slug: 'quiz-creation-basics',
    content: 'Learn the fundamentals of quiz creation...',
    tags: ['quiz', 'creation', 'basics'],
    lastUpdated: '2024-01-08',
    difficulty: 'Beginner'
  },
  {
    id: '5',
    category: 'Tournaments',
    title: 'Creating Your First Tournament',
    description:
      'Learn how to set up, configure, and launch a successful quiz tournament.',
    readTime: '6 min read',
    icon: Trophy,
    slug: 'creating-your-first-tournament',
    content: 'Tournament setup and management guide...',
    tags: ['tournament', 'competition', 'setup'],
    lastUpdated: '2024-01-05',
    difficulty: 'Intermediate'
  },
  {
    id: '6',
    category: 'Privacy',
    title: 'Understanding Privacy Settings',
    description:
      'A comprehensive guide to all privacy options available on the platform.',
    readTime: '5 min read',
    icon: Shield,
    slug: 'understanding-privacy-settings',
    content: 'Complete privacy settings overview...',
    tags: ['privacy', 'security', 'settings'],
    lastUpdated: '2024-01-03',
    difficulty: 'Beginner'
  },
  {
    id: '7',
    category: 'Quiz creation',
    title: 'Advanced Quiz Features',
    description:
      'Explore advanced features like timers, multimedia questions, and custom scoring.',
    readTime: '8 min read',
    icon: Settings,
    slug: 'advanced-quiz-features',
    content: 'Deep dive into advanced quiz functionality...',
    tags: ['quiz', 'advanced', 'features'],
    lastUpdated: '2024-01-01',
    difficulty: 'Advanced'
  },
  {
    id: '8',
    category: 'Account',
    title: 'Profile Customization Guide',
    description:
      'Learn how to personalize your profile with avatars, bio, and social links.',
    readTime: '3 min read',
    icon: User,
    slug: 'profile-customization-guide',
    content: 'Complete profile customization walkthrough...',
    tags: ['profile', 'customization', 'personalization'],
    lastUpdated: '2023-12-28',
    difficulty: 'Beginner'
  },
  {
    id: '9',
    category: 'Tournaments',
    title: 'Tournament Moderation Tools',
    description:
      'Master the tools available for moderating and managing tournament participants.',
    readTime: '7 min read',
    icon: Shield,
    slug: 'tournament-moderation-tools',
    content: 'Tournament moderation best practices...',
    tags: ['tournament', 'moderation', 'management'],
    lastUpdated: '2023-12-25',
    difficulty: 'Advanced'
  },
  {
    id: '10',
    category: 'Billing',
    title: 'Understanding Pricing Plans',
    description:
      'Compare different pricing tiers and find the plan that best suits your needs.',
    readTime: '4 min read',
    icon: CreditCard,
    slug: 'understanding-pricing-plans',
    content: 'Detailed pricing plan comparison...',
    tags: ['pricing', 'plans', 'comparison'],
    lastUpdated: '2023-12-22',
    difficulty: 'Beginner'
  },
  {
    id: '11',
    category: 'General',
    title: 'Mobile App Features',
    description:
      'Discover all the features available in our mobile application.',
    readTime: '6 min read',
    icon: BookOpen,
    slug: 'mobile-app-features',
    content: 'Complete mobile app feature overview...',
    tags: ['mobile', 'app', 'features'],
    lastUpdated: '2023-12-20',
    difficulty: 'Beginner'
  },
  {
    id: '12',
    category: 'Privacy',
    title: 'Data Export and Deletion',
    description:
      'Learn how to export your data or permanently delete your account.',
    readTime: '4 min read',
    icon: Shield,
    slug: 'data-export-and-deletion',
    content: 'Data management and account deletion guide...',
    tags: ['data', 'export', 'deletion', 'gdpr'],
    lastUpdated: '2023-12-18',
    difficulty: 'Intermediate'
  }
]
