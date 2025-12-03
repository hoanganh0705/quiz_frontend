import { Quiz } from '@/types/quiz'

export const quizzes: Quiz[] = [
  {
    id: '1',
    title: 'Basic Math Quiz',
    description:
      'Test your math knowledge with questions on algebra and geometry.',
    duration: 60,
    questionCount: 20,
    difficulty: 'Easy',
    image: '/placeholder.webp',
    currentPlayers: 10,
    players: 10,
    maxPlayers: 20,
    requirements: 'No prior knowledge required',
    tags: ['Mathematics', 'Algebra', 'Geometry'],
    categories: ['Mathematics', 'Algebra', 'Geometry'],
    isPopular: true,
    isFeatured: true,
    rating: 4.5,
    creator: {
      userId: 101,
      username: 'MathProfessor',
      name: 'Dr. John Smith',
      position: 'Mathematics Professor',
      imageURL: '/avatarPlaceholder.webp',
      quizzesCreated: 12,
      rating: 4.7
    },
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-07-01T12:00:00Z',
    questions: [
      {
        id: 1,
        question: 'How many legs does a dog have?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 2,
        question: 'How many sides does a square have?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 3,
        question: 'How many days are in a week?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '7'
      },
      {
        id: 4,
        question: 'What is 1 + 1?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '2'
      },
      {
        id: 5,
        question: 'What is 2 * 2?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 6,
        question: 'What is 5 - 1?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 7,
        question: 'What is 1 + 1?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '2'
      },
      {
        id: 8,
        question: 'What is 1 + 1?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '2'
      },
      {
        id: 9,
        question: 'What is 2 * 2?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 10,
        question: 'How many sides does a square have?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 11,
        question: 'How many days are in a week?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '7'
      },
      {
        id: 12,
        question: 'What shape has three sides?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '3'
      },
      {
        id: 13,
        question: 'What is 10 - 6?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 14,
        question: 'What is 3 + 2?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '5'
      },
      {
        id: 15,
        question: 'What is 5 - 1?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 16,
        question: '2 + 2 = ?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 17,
        question: 'What is 3 + 2?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '5'
      },
      {
        id: 18,
        question: 'What shape has three sides?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '3'
      },
      {
        id: 19,
        question: 'How many legs does a dog have?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      },
      {
        id: 20,
        question: 'What is 10 - 6?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3' },
          { label: 'B', value: '4' },
          { label: 'C', value: '5' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '4'
      }
    ],
    quizReview: [
      {
        userId: 1,
        username: 'MathLover123',
        rating: 4,
        comment: 'Great basic math quiz, perfect for beginners!',
        date: '2025-07-01T10:00:00Z'
      },
      {
        userId: 2,
        username: 'Student456',
        rating: 5,
        comment: 'Really helped me review algebra concepts.',
        date: '2025-07-02T15:30:00Z'
      }
    ],
    leaderBoard: [
      {
        userId: 1,
        username: 'MathLover123',
        score: 95,
        rank: 1,
        completedAt: '2025-07-01T10:30:00Z',
        time: '12:45'
      },
      {
        userId: 2,
        username: 'Student456',
        score: 90,
        rank: 2,
        completedAt: '2025-07-02T16:00:00Z',
        time: '13:20'
      }
    ],
    badges: ['Hot', 'Top Rated'],
    timeLeft: 3,
    reward: 50,
    spots: 20,
    spotsLeft: 10,
    bgGradient: 'from-blue-500 to-indigo-600',
    almostFull: true,
    authorAvatarSrc: '/avatarPlaceholder.webp',
    authorName: 'Dr. John Smith'
  },
  {
    id: '2',
    title: 'Vietnamese Literature Quiz',
    description: 'Explore famous Vietnamese literary works.',
    duration: 45,
    questionCount: 25,
    difficulty: 'Medium',
    image: '/q17.png',
    currentPlayers: 15,
    players: 15,
    maxPlayers: 500,
    requirements: 'Knowledge of Vietnamese literature',
    tags: ['Literature', 'Vietnamese'],
    categories: ['Literature', 'Vietnamese'],
    isPopular: false,
    isFeatured: true,
    rating: 4.8,
    creator: {
      userId: 102,
      username: 'LiteratureScholar',
      name: 'Dr. Nguyen Hoang Anh',
      position: 'Literature Professor',
      imageURL: '/avatarPlaceholder.webp',
      quizzesCreated: 8,
      rating: 4.9
    },
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2025-07-03T10:00:00Z',
    questions: [
      {
        id: 1,
        question: "Who is the author of 'The Tale of Kieu'?",
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'Nguyen Du' },
          { label: 'B', value: 'Ho Xuan Huong' },
          { label: 'C', value: 'Nguyen Trai' },
          { label: 'D', value: 'To Huu' }
        ],
        correctAnswer: 'Nguyen Du'
      },
      {
        id: 2,
        question: "Who is the author of 'The Tale of Kieu'?",
        image: '/q17.png',
        answers: [
          { label: 'A', value: 'Nguyen Du' },
          { label: 'B', value: 'Ho Xuan Huong' },
          { label: 'C', value: 'Nguyen Trai' },
          { label: 'D', value: 'To Huu' }
        ],
        correctAnswer: 'Nguyen Du'
      },
      {
        id: 3,
        question: "Who is the author of 'The Tale of Kieu'?",
        image: '/q17.png',
        answers: [
          { label: 'A', value: 'Nguyen Du' },
          { label: 'B', value: 'Ho Xuan Huong' },
          { label: 'C', value: 'Nguyen Trai' },
          { label: 'D', value: 'To Huu' }
        ],
        correctAnswer: 'Nguyen Du'
      }
    ],
    quizReview: [
      {
        userId: 3,
        username: 'LitFan789',
        rating: 5,
        comment: 'Excellent quiz on Vietnamese literature!',
        date: '2025-07-03T09:00:00Z'
      }
    ],
    leaderBoard: [
      {
        userId: 3,
        username: 'LitFan789',
        score: 85,
        rank: 1,
        completedAt: '2025-07-03T09:45:00Z',
        time: '12:45'
      }
    ],
    badges: ['Trending', "Editor's Choice"],
    timeLeft: 5,
    reward: 75,
    spots: 500,
    spotsLeft: 485,
    bgGradient: 'from-purple-500 to-pink-600',
    almostFull: false,
    authorAvatarSrc: '/avatarPlaceholder.webp',
    authorName: 'Dr. Nguyen Hoang Anh'
  },
  {
    id: '3',
    title: 'Pop Culture Essentials',
    description: '',
    duration: 8,
    questionCount: 0,
    difficulty: 'Medium',
    image: '/placeholder.webp',
    currentPlayers: 60,
    players: 60,
    maxPlayers: 100,
    requirements: '',
    tags: ['Entertainment'],
    categories: ['Entertainment'],
    isPopular: false,
    isFeatured: false,
    rating: 0,
    creator: {
      userId: 103,
      username: 'AlexSmith',
      name: 'Alex Smith',
      position: 'Entertainment Professor',
      imageURL: '/avatarPlaceholder.webp',
      quizzesCreated: 5,
      rating: 4.2
    },
    createdAt: '2025-06-20T10:00:00Z',
    updatedAt: '2025-07-01T14:00:00Z',
    questions: [],
    quizReview: [
      {
        userId: 201,
        username: 'MarvelFan',
        rating: 5,
        comment: 'Excellent quiz! Really tests your knowledge of the MCU.',
        date: '2025-07-01T12:00:00Z'
      },
      {
        userId: 202,
        username: 'QuizLover',
        rating: 4,
        comment: 'Good variety of questions, some were quite challenging.',
        date: '2025-07-02T09:30:00Z'
      },
      {
        userId: 203,
        username: 'Avenger',
        rating: 5,
        comment: 'Perfect for Marvel fans. I learned some new facts too!',
        date: '2025-07-03T16:45:00Z'
      }
    ],
    leaderBoard: [
      {
        userId: 1,
        username: 'ThorFan',
        score: '98%',
        rank: 1,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '12:45'
      },
      {
        userId: 2,
        username: 'IronManRules',
        score: '95%',
        rank: 2,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '13:20'
      },
      {
        userId: 3,
        username: 'CaptainAmerica',
        score: '92%',
        rank: 3,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '14:05'
      },
      {
        userId: 4,
        username: 'BlackWidow',
        score: '90%',
        rank: 4,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '15:30'
      },
      {
        userId: 5,
        username: 'HulkSmash',
        score: '88%',
        rank: 5,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '16:15'
      }
    ],
    badges: [],
    timeLeft: 0,
    reward: 2.5,
    spots: 100,
    spotsLeft: 40,
    bgGradient: '',
    almostFull: false,
    authorAvatarSrc: '/avatarPlaceholder.webp',
    authorName: 'Alex Smith'
  },
  {
    id: '4',
    title: 'Science for Beginners',
    description: '',
    duration: 12,
    questionCount: 0,
    difficulty: 'Medium',
    image: '/placeholder.webp',
    currentPlayers: 90,
    players: 90,
    maxPlayers: 100,
    requirements: '',
    tags: ['Science'],
    categories: ['Science'],
    isPopular: false,
    isFeatured: false,
    rating: 0,
    creator: {
      userId: 104,
      username: 'AlexSmith',
      name: 'Alex Smith',
      position: 'Science Professor',
      imageURL: '/avatarPlaceholder.webp',
      quizzesCreated: 3,
      rating: 4.0
    },
    createdAt: '2025-06-25T11:00:00Z',
    updatedAt: '2025-07-02T13:00:00Z',
    questions: [],
    quizReview: [],
    leaderBoard: [],
    badges: [],
    timeLeft: 0,
    reward: 3.5,
    spots: 100,
    spotsLeft: 10,
    bgGradient: '',
    almostFull: true,
    authorAvatarSrc: '/avatarPlaceholder.webp',
    authorName: 'Alex Smith'
  }
]

export default quizzes
