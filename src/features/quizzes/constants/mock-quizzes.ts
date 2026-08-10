export interface MockQuiz {
  id: string
  title: string
  image: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number
  currentPlayers: number
  maxPlayers: number
  spotsLeft: number
  reward: number
  creator: {
    name: string
    imageURL: string
  }
  categories: string[]
}

export const quizzes: MockQuiz[] = [
  {
    id: '1',
    title: 'JavaScript Fundamentals',
    image: '/placeholder.webp',
    difficulty: 'easy',
    duration: 1800000,
    currentPlayers: 45,
    maxPlayers: 100,
    spotsLeft: 55,
    reward: 100,
    creator: { name: 'Quiz Master', imageURL: '/placeholder.webp' },
    categories: ['Programming'],
  },
  {
    id: '2',
    title: 'React Advanced Patterns',
    image: '/placeholder.webp',
    difficulty: 'medium',
    duration: 2400000,
    currentPlayers: 30,
    maxPlayers: 50,
    spotsLeft: 20,
    reward: 200,
    creator: { name: 'React Expert', imageURL: '/placeholder.webp' },
    categories: ['Programming'],
  },
  {
    id: '3',
    title: 'TypeScript Mastery',
    image: '/placeholder.webp',
    difficulty: 'hard',
    duration: 3600000,
    currentPlayers: 15,
    maxPlayers: 25,
    spotsLeft: 10,
    reward: 300,
    creator: { name: 'TypeScript Pro', imageURL: '/placeholder.webp' },
    categories: ['Programming'],
  },
]
