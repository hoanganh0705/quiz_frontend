import { Quiz } from '@/features/quizzes/types/quiz'

export const quizzes: Quiz[] = [
  {
    id: '1',
    title: 'Basic Math Quiz',
    description:
      'Test your math knowledge with questions on algebra and geometry.',
    duration: 600,
    questionCount: 20,
    difficulty: 'Easy',
    image: '/placeholder.webp',
    currentPlayers: 10,
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
        question: 'What is 15% of 200?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '20' },
          { label: 'B', value: '25' },
          { label: 'C', value: '30' },
          { label: 'D', value: '35' }
        ],
        correctAnswer: '30'
      },
      {
        id: 2,
        question: 'Solve for x: 3x + 7 = 22',
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
        id: 3,
        question: 'What is the square root of 144?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '10' },
          { label: 'B', value: '11' },
          { label: 'C', value: '12' },
          { label: 'D', value: '14' }
        ],
        correctAnswer: '12'
      },
      {
        id: 4,
        question: 'If a triangle has angles of 60° and 70°, what is the third angle?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '40°' },
          { label: 'B', value: '50°' },
          { label: 'C', value: '60°' },
          { label: 'D', value: '70°' }
        ],
        correctAnswer: '50°'
      },
      {
        id: 5,
        question: 'What is 2³ (2 cubed)?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '6' },
          { label: 'B', value: '8' },
          { label: 'C', value: '9' },
          { label: 'D', value: '16' }
        ],
        correctAnswer: '8'
      },
      {
        id: 6,
        question: 'Which of the following is a prime number?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '21' },
          { label: 'B', value: '27' },
          { label: 'C', value: '29' },
          { label: 'D', value: '33' }
        ],
        correctAnswer: '29'
      },
      {
        id: 7,
        question: 'What is the perimeter of a rectangle with length 8 cm and width 5 cm?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '13 cm' },
          { label: 'B', value: '26 cm' },
          { label: 'C', value: '40 cm' },
          { label: 'D', value: '24 cm' }
        ],
        correctAnswer: '26 cm'
      },
      {
        id: 8,
        question: 'Simplify: (x² · x³) ÷ x⁴',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'x' },
          { label: 'B', value: 'x²' },
          { label: 'C', value: '1' },
          { label: 'D', value: 'x⁵' }
        ],
        correctAnswer: 'x'
      },
      {
        id: 9,
        question: 'What is the area of a circle with radius 7 cm? (Use π ≈ 22/7)',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '44 cm²' },
          { label: 'B', value: '154 cm²' },
          { label: 'C', value: '22 cm²' },
          { label: 'D', value: '308 cm²' }
        ],
        correctAnswer: '154 cm²'
      },
      {
        id: 10,
        question: 'Find the mean of: 4, 8, 12, 16, 20',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '10' },
          { label: 'B', value: '12' },
          { label: 'C', value: '14' },
          { label: 'D', value: '8' }
        ],
        correctAnswer: '12'
      },
      {
        id: 11,
        question: 'What is the next number in the sequence: 2, 6, 12, 20, 30, ?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '40' },
          { label: 'B', value: '42' },
          { label: 'C', value: '44' },
          { label: 'D', value: '38' }
        ],
        correctAnswer: '42'
      },
      {
        id: 12,
        question: 'If 4 workers can paint a fence in 6 hours, how long would 8 workers take?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '2 hours' },
          { label: 'B', value: '3 hours' },
          { label: 'C', value: '4 hours' },
          { label: 'D', value: '12 hours' }
        ],
        correctAnswer: '3 hours'
      },
      {
        id: 13,
        question: 'What is the value of 0.75 expressed as a fraction in simplest form?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '3/5' },
          { label: 'B', value: '5/8' },
          { label: 'C', value: '3/4' },
          { label: 'D', value: '7/10' }
        ],
        correctAnswer: '3/4'
      },
      {
        id: 14,
        question: 'How many edges does a rectangular prism have?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '8' },
          { label: 'B', value: '10' },
          { label: 'C', value: '12' },
          { label: 'D', value: '6' }
        ],
        correctAnswer: '12'
      },
      {
        id: 15,
        question: 'What is the result of 3/4 − 1/3 expressed in simplest form?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '2/1' },
          { label: 'B', value: '5/12' },
          { label: 'C', value: '5/7' },
          { label: 'D', value: '1/2' }
        ],
        correctAnswer: '5/12'
      },
      {
        id: 16,
        question: 'A car travels 240 km in 4 hours. What is its average speed in km/h?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '50 km/h' },
          { label: 'B', value: '60 km/h' },
          { label: 'C', value: '70 km/h' },
          { label: 'D', value: '55 km/h' }
        ],
        correctAnswer: '60 km/h'
      },
      {
        id: 17,
        question: 'What is the sum of the interior angles of a hexagon?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '540°' },
          { label: 'B', value: '720°' },
          { label: 'C', value: '900°' },
          { label: 'D', value: '1080°' }
        ],
        correctAnswer: '720°'
      },
      {
        id: 18,
        question: 'Solve: |x − 5| = 3. What are the possible values of x?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '2 and 8' },
          { label: 'B', value: '3 and 5' },
          { label: 'C', value: '5 only' },
          { label: 'D', value: '-2 and 8' }
        ],
        correctAnswer: '2 and 8'
      },
      {
        id: 19,
        question: 'A product costs $80 and is discounted by 15%. What is the sale price?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '$68' },
          { label: 'B', value: '$65' },
          { label: 'C', value: '$72' },
          { label: 'D', value: '$70' }
        ],
        correctAnswer: '$68'
      },
      {
        id: 20,
        question: 'What is the probability of rolling a sum of 7 with two fair dice?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '1/6' },
          { label: 'B', value: '1/9' },
          { label: 'C', value: '7/36' },
          { label: 'D', value: '1/12' }
        ],
        correctAnswer: '1/6'
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
    leaderboard: [
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
    spotsLeft: 10,
    bgGradient: 'from-blue-500 to-indigo-600',
    almostFull: true
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
    leaderboard: [
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
    spotsLeft: 485,
    bgGradient: 'from-purple-500 to-pink-600',
    almostFull: false
  },
  {
    id: '3',
    title: 'Pop Culture Essentials',
    description: 'Test your knowledge of movies, music, and entertainment trends.',
    duration: 8,
    questionCount: 3,
    difficulty: 'Medium',
    image: '/placeholder.webp',
    currentPlayers: 60,
    maxPlayers: 100,
    requirements: '',
    tags: ['Entertainment'],
    categories: ['Entertainment'],
    isPopular: false,
    isFeatured: false,
    rating: 4.3,
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
    questions: [
      {
        id: 1,
        question: 'Which movie won the Academy Award for Best Picture in 2024?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'Oppenheimer' },
          { label: 'B', value: 'Barbie' },
          { label: 'C', value: 'Killers of the Flower Moon' },
          { label: 'D', value: 'Poor Things' }
        ],
        correctAnswer: 'Oppenheimer'
      },
      {
        id: 2,
        question: 'Who is the lead singer of the band Coldplay?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'Bono' },
          { label: 'B', value: 'Chris Martin' },
          { label: 'C', value: 'Thom Yorke' },
          { label: 'D', value: 'Eddie Vedder' }
        ],
        correctAnswer: 'Chris Martin'
      },
      {
        id: 3,
        question: 'What is the highest-grossing film of all time?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'Avengers: Endgame' },
          { label: 'B', value: 'Avatar' },
          { label: 'C', value: 'Titanic' },
          { label: 'D', value: 'Star Wars: The Force Awakens' }
        ],
        correctAnswer: 'Avatar'
      }
    ],
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
    leaderboard: [
      {
        userId: 1,
        username: 'ThorFan',
        score: 98,
        rank: 1,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '12:45'
      },
      {
        userId: 2,
        username: 'IronManRules',
        score: 95,
        rank: 2,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '13:20'
      },
      {
        userId: 3,
        username: 'CaptainAmerica',
        score: 92,
        rank: 3,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '14:05'
      },
      {
        userId: 4,
        username: 'BlackWidow',
        score: 90,
        rank: 4,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '15:30'
      },
      {
        userId: 5,
        username: 'HulkSmash',
        score: 88,
        rank: 5,
        completedAt: '2025-07-03T09:45:00Z',
        avatar: '/avatarPlaceholder.webp',
        time: '16:15'
      }
    ],
    badges: [],
    timeLeft: 0,
    reward: 2.5,
    spotsLeft: 40,
    bgGradient: 'from-orange-500 to-red-600',
    almostFull: false
  },
  {
    id: '4',
    title: 'Science for Beginners',
    description: 'Discover fundamental science concepts with this beginner-friendly quiz.',
    duration: 12,
    questionCount: 3,
    difficulty: 'Medium',
    image: '/placeholder.webp',
    currentPlayers: 90,
    maxPlayers: 100,
    requirements: '',
    tags: ['Science'],
    categories: ['Science'],
    isPopular: false,
    isFeatured: false,
    rating: 4.1,
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
    questions: [
      {
        id: 1,
        question: 'What is the chemical symbol for water?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'H2O' },
          { label: 'B', value: 'CO2' },
          { label: 'C', value: 'NaCl' },
          { label: 'D', value: 'O2' }
        ],
        correctAnswer: 'H2O'
      },
      {
        id: 2,
        question: 'What planet is known as the Red Planet?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: 'Venus' },
          { label: 'B', value: 'Mars' },
          { label: 'C', value: 'Jupiter' },
          { label: 'D', value: 'Saturn' }
        ],
        correctAnswer: 'Mars'
      },
      {
        id: 3,
        question: 'What is the speed of light approximately?',
        image: '/question.jpg',
        answers: [
          { label: 'A', value: '300,000 km/s' },
          { label: 'B', value: '150,000 km/s' },
          { label: 'C', value: '500,000 km/s' },
          { label: 'D', value: '1,000,000 km/s' }
        ],
        correctAnswer: '300,000 km/s'
      }
    ],
    quizReview: [],
    leaderboard: [],
    badges: [],
    timeLeft: 0,
    reward: 3.5,
    spotsLeft: 10,
    bgGradient: 'from-green-500 to-teal-600',
    almostFull: true
  }
]
