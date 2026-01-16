interface ChallengeEntry {
  id: string
  date: string
  category: string
  score: number
  rank: number
  isTopTen?: boolean
}

export const challengeData: ChallengeEntry[] = [
  {
    id: 'challenge-2025-05-19',
    date: 'May 19, 2025',
    category: 'History & Culture',
    score: 80,
    rank: 15
  },
  {
    id: 'challenge-2025-05-18',
    date: 'May 18, 2025',
    category: 'Entertainment',
    score: 60,
    rank: 42
  },
  {
    id: 'challenge-2025-05-17',
    date: 'May 17, 2025',
    category: 'Geography',
    score: 90,
    rank: 7,
    isTopTen: true
  },
  {
    id: 'challenge-2025-05-16',
    date: 'May 16, 2025',
    category: 'Science & Technology',
    score: 70,
    rank: 23
  },
  {
    id: 'challenge-2025-05-15',
    date: 'May 15, 2025',
    category: 'Sports & Games',
    score: 85,
    rank: 12
  }
]
