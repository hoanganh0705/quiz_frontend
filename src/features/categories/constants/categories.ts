export interface Category {
  id: string
  name: string
  icon: string
  active: boolean
  description: string
  color: string
  textColor: string
  count: number
  slug: string
  popularity: number
  difficultyRange: [number, number]
  createdAt: string
  updatedAt: string
  isFeatured: boolean
  imageUrl: string
}

export const categories: Category[] = [
  {
    id: 'all-categories',
    name: 'All Categories',
    icon: '🌐',
    active: true,
    description: 'Explore quizzes across all available categories.',
    color: 'bg-gray-500',
    textColor: 'text-white',
    count: 100,
    slug: 'all-categories',
    popularity: 100,
    difficultyRange: [1, 5],
    createdAt: '2023-10-01T08:00:00Z',
    updatedAt: '2025-08-01T12:00:00Z',
    isFeatured: true,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🧪',
    active: false,
    description: 'Test your knowledge in physics, chemistry, and biology.',
    color: 'bg-blue-500',
    textColor: 'text-white',
    count: 15,
    slug: 'science',
    popularity: 85,
    difficultyRange: [2, 4],
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2025-07-10T14:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'history',
    name: 'History',
    icon: '🏛️',
    active: false,
    description: 'Dive into quizzes about historical events and figures.',
    color: 'bg-green-500',
    textColor: 'text-white',
    count: 12,
    slug: 'history',
    popularity: 70,
    difficultyRange: [2, 3],
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2025-07-15T15:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'geography',
    name: 'Geography',
    icon: '🌍',
    active: false,
    description: 'Explore quizzes about countries, capitals, and landscapes.',
    color: 'bg-teal-500',
    textColor: 'text-white',
    count: 10,
    slug: 'geography',
    popularity: 65,
    difficultyRange: [1, 3],
    createdAt: '2023-12-10T11:00:00Z',
    updatedAt: '2025-07-20T16:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '📊',
    active: false,
    description: 'Challenge your skills in algebra, geometry, and more.',
    color: 'bg-indigo-500',
    textColor: 'text-white',
    count: 20,
    slug: 'mathematics',
    popularity: 80,
    difficultyRange: [2, 5],
    createdAt: '2023-11-15T12:00:00Z',
    updatedAt: '2025-07-25T17:00:00Z',
    isFeatured: true,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'literature',
    name: 'Literature',
    icon: '📚',
    active: false,
    description: 'Test your knowledge of books, authors, and literary works.',
    color: 'bg-pink-500',
    textColor: 'text-white',
    count: 8,
    slug: 'literature',
    popularity: 60,
    difficultyRange: [2, 4],
    createdAt: '2024-01-01T13:00:00Z',
    updatedAt: '2025-07-30T18:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '🏆',
    active: false,
    description: 'Quizzes about sports, athletes, and competitions.',
    color: 'bg-red-600',
    textColor: 'text-white',
    count: 7,
    slug: 'sports',
    popularity: 75,
    difficultyRange: [1, 3],
    createdAt: '2024-01-15T14:00:00Z',
    updatedAt: '2025-08-01T19:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    active: false,
    description:
      'Test your knowledge about songs, genres, and famous musicians.',
    color: 'bg-orange-500',
    textColor: 'text-black',
    count: 2,
    slug: 'music',
    popularity: 62,
    difficultyRange: [1, 2],
    createdAt: '2024-02-15T10:30:00Z',
    updatedAt: '2025-06-05T15:45:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'movies',
    name: 'Movies & TV',
    icon: '🎬',
    active: false,
    description:
      'Explore quizzes and content related to films, actors, and directors.',
    color: 'bg-purple-500',
    textColor: 'text-white',
    count: 9,
    slug: 'movies',
    popularity: 87,
    difficultyRange: [1, 3],
    createdAt: '2023-11-01T08:00:00Z',
    updatedAt: '2025-07-10T12:00:00Z',
    isFeatured: true,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'politics',
    name: 'Politics',
    icon: '🗳️',
    active: false,
    description:
      'Dive into quizzes about global politics, history, and current affairs.',
    color: 'bg-red-500',
    textColor: 'text-white',
    count: 6,
    slug: 'politics',
    popularity: 74,
    difficultyRange: [2, 4],
    createdAt: '2024-08-20T09:15:00Z',
    updatedAt: '2025-07-01T14:00:00Z',
    isFeatured: false,
    imageUrl: '/quizCategories.webp'
  },
  {
    id: 'puzzle',
    name: 'Puzzle',
    icon: '🧩',
    active: false,
    description:
      'Challenge your brain with logic puzzles, riddles, and problem-solving tasks.',
    color: 'bg-yellow-500',
    textColor: 'text-black',
    count: 4,
    slug: 'puzzle',
    popularity: 91,
    difficultyRange: [3, 5],
    createdAt: '2023-12-05T11:00:00Z',
    updatedAt: '2025-07-15T17:30:00Z',
    isFeatured: true,
    imageUrl: '/quizCategories.webp'
  }
]

export default categories
