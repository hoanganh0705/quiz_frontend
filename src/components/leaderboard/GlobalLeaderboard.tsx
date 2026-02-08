import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

// Extended mock data for global leaderboard
const globalLeaderboardData = [
  {
    rank: 4,
    name: 'Jennifer Liu',
    points: 12890,
    avatar: '/professional-avatar-jennifer.png',
    badge: 'Gold',
    badgeColor: 'bg-yellow-600',
    change: '+2'
  },
  {
    rank: 5,
    name: 'Robert Smith',
    points: 12340,
    avatar: '/professional-avatar-robert.png',
    badge: 'Gold',
    badgeColor: 'bg-yellow-600',
    change: '-1'
  },
  {
    rank: 6,
    name: 'Maria Garcia',
    points: 11950,
    avatar: '/professional-avatar-maria.png',
    badge: 'Gold',
    badgeColor: 'bg-yellow-600',
    change: '+3'
  },
  {
    rank: 7,
    name: 'Kevin Wong',
    points: 11720,
    avatar: '/professional-avatar-kevin.png',
    badge: 'Silver',
    badgeColor: 'bg-gray-500',
    change: '0'
  },
  {
    rank: 8,
    name: 'Amanda Taylor',
    points: 11450,
    avatar: '/professional-avatar-amanda.png',
    badge: 'Silver',
    badgeColor: 'bg-gray-500',
    change: '+1'
  }
]

export function GlobalLeaderboard() {
  return (
    <div className='mt-8 max-w-7xl mx-auto'>
      <Card className='bg-transparent border-slate-700'>
        <CardHeader>
          <CardTitle className='text-white text-xl font-bold'>
            Global Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {globalLeaderboardData.map((user) => (
              <div
                key={user.rank}
                className='flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white'>
                    {user.rank}
                  </div>

                  <div className='w-10 h-10 rounded-full overflow-hidden'>
                    <Image
                      src={user.avatar || '/placeholder.svg'}
                      alt={user.name}
                      width={40}
                      height={40}
                      className='w-full h-full object-cover'
                    />
                  </div>

                  <div>
                    <h3 className='text-white font-medium'>{user.name}</h3>
                    <p className='text-slate-400 text-sm'>
                      {user.points.toLocaleString()} points
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <Badge className={`${user.badgeColor} text-xs`}>
                    {user.badge}
                  </Badge>

                  <div
                    className={`text-xs px-2 py-1 rounded ${
                      user.change.startsWith('+')
                        ? 'text-green-400 bg-green-400/10'
                        : user.change.startsWith('-')
                        ? 'text-red-400 bg-red-400/10'
                        : 'text-slate-400 bg-slate-400/10'
                    }`}
                  >
                    {user.change !== '0' ? user.change : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
