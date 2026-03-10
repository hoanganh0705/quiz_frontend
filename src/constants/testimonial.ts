import { Testimonial } from '@/types/testimonials'

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Quiz Creator',
    avatar: '/avatarPlaceholder.webp',
    quote:
      "I've created over 50 quizzes and earned more than $2,000 in just three months. The platform makes it incredibly easy to monetize my knowledge!",
    earnings: '$2,000+',
    quizzes: '50',
    followers: '1.2k',
    rating: 5
  },
  {
    id: 2,
    name: 'John Doe',
    role: 'Quiz Enthusiast',
    avatar: '/avatarPlaceholder.webp',
    quote:
      'This platform has transformed how I learn and engage with new topics. The quizzes are fun, and earning rewards is a fantastic bonus!',
    earnings: '$500+',
    quizzes: '150',
    followers: '500',
    rating: 4
  },
  {
    id: 3,
    name: 'Jane Smith',
    role: 'Educator',
    avatar: '/avatarPlaceholder.webp',
    quote:
      'As an educator, I find this platform invaluable for creating interactive learning experiences. My students love the quizzes, and it helps them retain information better.',
    earnings: '$1,000+',
    quizzes: '75',
    followers: '800',
    rating: 5
  }
]
