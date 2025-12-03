interface ChallengeEntry {
  date: string
  category: string
  score: number
  rank: number
  isTopTen?: boolean
}

export const challengeData: ChallengeEntry[] = [
  {
    date: 'May 19, 2025',
    category: 'History & Culture',
    score: 80,
    rank: 15
  },
  {
    date: 'May 18, 2025',
    category: 'Entertainment',
    score: 60,
    rank: 42
  },
  {
    date: 'May 17, 2025',
    category: 'Geography',
    score: 90,
    rank: 7,
    isTopTen: true
  },
  {
    date: 'May 16, 2025',
    category: 'Science & Technology',
    score: 70,
    rank: 23
  },
  {
    date: 'May 15, 2025',
    category: 'Sports & Games',
    score: 85,
    rank: 12
  }
]
