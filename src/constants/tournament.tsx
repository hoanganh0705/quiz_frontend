import { Tournament } from '@/types/tournament'

export const tournaments: Tournament[] = [
  {
    id: 1,
    title: 'Science Showdown',
    description:
      'Test your scientific knowledge across physics, chemistry, biology...',
    image: '/tournament.png',
    difficulty: 'Medium',
    status: 'Registration Open',
    statusColor: 'bg-green-500',
    participants: 342,
    prize: '$1,000',
    dateRange: 'June 1 - June 15, 2023',
    closingInfo: 'Closes in 2 days',
    startDate: '2023-06-01',
    endDate: '2023-06-15',
    registrationOpen: true,
    category: 'Science'
  },
  {
    id: 2,
    title: 'History Heroes',
    description:
      'Journey through time and test your knowledge of historical events and...',
    image: '/tournament.png',
    difficulty: 'Hard',
    status: 'Upcoming',
    statusColor: 'bg-blue-500',
    participants: 215,
    prize: '$750',
    dateRange: 'June 5 - June 20, 2023',
    startDate: '2023-06-05',
    endDate: '2023-06-20',
    registrationOpen: false,
    category: 'History'
  },
  {
    id: 3,
    title: 'Pop Culture Party',
    description: 'From movies to music, test your knowledge of all things...',
    image: '/tournament.png',
    difficulty: 'Easy',
    status: 'Ongoing',
    statusColor: 'bg-orange-500',
    participants: 567,
    prize: '$1,500',
    dateRange: 'May 20 - June 5, 2023',
    startDate: '2023-05-20',
    endDate: '2023-06-05',
    registrationOpen: false,
    category: 'Pop Culture'
  },
  {
    id: 4,
    title: 'Geography Genius',
    description: 'Navigate through countries, capitals, landmarks and...',
    image: '/tournament.png',
    difficulty: 'Medium',
    status: 'Registration Open',
    statusColor: 'bg-green-500',
    participants: 189,
    prize: '$800',
    dateRange: 'June 10 - June 25, 2023',
    startDate: '2023-06-10',
    endDate: '2023-06-25',
    registrationOpen: true,
    category: 'Geography'
  }
]
