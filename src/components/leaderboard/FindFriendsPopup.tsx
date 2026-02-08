'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, Users, Star, Trophy } from 'lucide-react'
import Image from 'next/image'

interface Friend {
  id: string
  name: string
  username: string
  avatar: string
  points: number
  rank: number
  badge: string
  badgeColor: string
  isOnline: boolean
  mutualFriends: number
}

const mockFriends: Friend[] = [
  {
    id: '1',
    name: 'Emma Wilson',
    username: '@emmaw',
    avatar: '/professional-avatar-emma.png',
    points: 12450,
    rank: 8,
    badge: 'Gold',
    badgeColor: 'bg-yellow-600',
    isOnline: true,
    mutualFriends: 3
  },
  {
    id: '2',
    name: 'David Park',
    username: '@davidp',
    avatar: '/professional-avatar-david.png',
    points: 11200,
    rank: 15,
    badge: 'Gold',
    badgeColor: 'bg-yellow-600',
    isOnline: false,
    mutualFriends: 1
  },
  {
    id: '3',
    name: 'Lisa Chen',
    username: '@lisac',
    avatar: '/professional-avatar-lisa.png',
    points: 13800,
    rank: 5,
    badge: 'Diamond',
    badgeColor: 'bg-blue-600',
    isOnline: true,
    mutualFriends: 5
  },
  {
    id: '4',
    name: 'James Rodriguez',
    username: '@jamesr',
    avatar: '/professional-avatar-james.png',
    points: 9850,
    rank: 28,
    badge: 'Silver',
    badgeColor: 'bg-gray-500',
    isOnline: true,
    mutualFriends: 2
  }
]

interface FindFriendsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function FindFriendsPopup({ isOpen, onClose }: FindFriendsPopupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'suggested' | 'search'>(
    'suggested'
  )

  const filteredFriends = mockFriends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Users className='w-5 h-5' />
            Find Friends
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Search Bar */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400' />
            <Input
              placeholder='Search by name or username...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
            />
          </div>

          {/* Tabs */}
          <div className='flex gap-2'>
            <Button
              variant={selectedTab === 'suggested' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedTab('suggested')}
              className={
                selectedTab === 'suggested'
                  ? 'bg-default hover:bg-default-hover'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }
            >
              Suggested Friends
            </Button>
            <Button
              variant={selectedTab === 'search' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedTab('search')}
              className={
                selectedTab === 'search'
                  ? 'bg-default hover:bg-default-hover'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }
            >
              Search Results
            </Button>
          </div>

          {/* Friends List */}
          <div className='space-y-3 max-h-96 overflow-y-auto'>
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className='flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors'
              >
                <div className='flex items-center gap-3'>
                  <div className='relative'>
                    <div className='w-12 h-12 rounded-full overflow-hidden'>
                      <Image
                        src={friend.avatar || '/placeholder.svg'}
                        alt={friend.name}
                        width={48}
                        height={48}
                        className='w-full h-full object-cover'
                      />
                    </div>
                    {friend.isOnline && (
                      <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900' />
                    )}
                  </div>

                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-semibold text-white'>
                        {friend.name}
                      </h3>
                      <span className='text-slate-400 text-sm'>
                        {friend.username}
                      </span>
                    </div>

                    <div className='flex items-center gap-3 mt-1'>
                      <div className='flex items-center gap-1'>
                        <Trophy className='w-3 h-3 text-yellow-400' />
                        <span className='text-xs text-slate-400'>
                          Rank #{friend.rank}
                        </span>
                      </div>

                      <div className='flex items-center gap-1'>
                        <Star className='w-3 h-3 text-blue-400' />
                        <span className='text-xs text-slate-400'>
                          {friend.points.toLocaleString()} pts
                        </span>
                      </div>

                      <Badge className={`${friend.badgeColor} text-xs`}>
                        {friend.badge}
                      </Badge>
                    </div>

                    {friend.mutualFriends > 0 && (
                      <p className='text-xs text-slate-500 mt-1'>
                        {friend.mutualFriends} mutual friend
                        {friend.mutualFriends !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size='sm'
                  className='bg-default hover:bg-default-hover text-white'
                >
                  <UserPlus className='w-4 h-4 mr-1' />
                  Add Friend
                </Button>
              </div>
            ))}
          </div>

          {filteredFriends.length === 0 && searchQuery && (
            <div className='text-center py-8 text-slate-400'>
              <Users className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>No friends found matching &quot;{searchQuery}&quot;</p>
              <p className='text-sm mt-1'>
                Try searching with a different name or username
              </p>
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-slate-700'>
          <Button
            variant='outline'
            onClick={onClose}
            className='border-slate-600 text-slate-300 hover:bg-slate-700'
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
