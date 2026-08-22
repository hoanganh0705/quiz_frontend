import { Testimonial } from '@/features/users/types'

// Illustrative testimonial copy. These names and quotes are fictional
// examples — not real users. Real testimonial data should come from a
// signed-source feed before being shown to visitors.
export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sample creator story',
    role: 'Quiz creator (illustrative)',
    avatar: '/avatarPlaceholder.webp',
    quote:
      'Building quizzes here has helped me reach an audience that actually engages with the topics I love.',
    earnings: '—',
    quizzes: '—',
    followers: '—',
    rating: 5,
  },
  {
    id: 2,
    name: 'Sample player story',
    role: 'Quiz player (illustrative)',
    avatar: '/avatarPlaceholder.webp',
    quote:
      'The variety of quizzes keeps me coming back. I learn something new every time I play.',
    earnings: '—',
    quizzes: '—',
    followers: '—',
    rating: 4,
  },
  {
    id: 3,
    name: 'Sample educator story',
    role: 'Educator (illustrative)',
    avatar: '/avatarPlaceholder.webp',
    quote:
      'I use the quiz format to introduce new topics and the engagement numbers beat anything I have tried before.',
    earnings: '—',
    quizzes: '—',
    followers: '—',
    rating: 5,
  },
]