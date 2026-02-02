'use client'

import { Users, UserPlus, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface EmptyFriendsProps {
  type: 'no-friends' | 'no-requests' | 'no-search-results'
  searchQuery?: string
}

export function EmptyFriends({ type, searchQuery }: EmptyFriendsProps) {
  if (type === 'no-friends') {
    return (
      <EmptyState
        icon={Users}
        title='No friends yet'
        description='Connect with other quiz enthusiasts! Find friends to compete with, compare scores, and share your favorite quizzes.'
        size='lg'
        actions={[
          {
            label: 'Find Friends',
            href: '/friends/find',
            icon: Search
          },
          {
            label: 'Invite Friends',
            variant: 'outline',
            icon: UserPlus,
            href: '/friends/invite'
          }
        ]}
      />
    )
  }

  if (type === 'no-requests') {
    return (
      <EmptyState
        icon={UserPlus}
        title='No friend requests'
        description="You don't have any pending friend requests. Start connecting with other players!"
        size='md'
        actions={[
          {
            label: 'Find Friends',
            href: '/friends/find',
            icon: Search
          }
        ]}
      />
    )
  }

  if (type === 'no-search-results') {
    return (
      <EmptyState
        icon={Search}
        title='No users found'
        description={
          searchQuery
            ? `We couldn't find any users matching "${searchQuery}". Try a different search term.`
            : 'No users match your search criteria. Try a different search term.'
        }
        size='md'
      />
    )
  }

  return null
}
