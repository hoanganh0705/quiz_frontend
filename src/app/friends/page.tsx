'use client'

import { memo, useMemo, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useLocalStorage } from '@/hooks'
import {
  currentUserStats,
  defaultSocialState,
  friendProfiles,
  type SocialState
} from '@/constants/friends'
import { quizzes } from '@/constants/mockQuizzes'
import { Search, Users, UserPlus, Check, X, Send } from 'lucide-react'

const quizOptions = quizzes.slice(0, 12).map((quiz) => ({
  id: quiz.id,
  title: quiz.title
}))

const statusClassMap: Record<'online' | 'away' | 'offline', string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400'
}

const FriendsPage = memo(function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [compareFriendId, setCompareFriendId] = useState<string>('')
  const [inviteSelections, setInviteSelections] = useState<
    Record<number, string>
  >({})
  const [socialState, setSocialState] = useLocalStorage<SocialState>(
    'social_state_v1',
    defaultSocialState
  )

  const profileMap = useMemo(
    () => new Map(friendProfiles.map((profile) => [profile.id, profile])),
    []
  )

  const friends = useMemo(
    () =>
      socialState.friends
        .map((id) => profileMap.get(id))
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile)
        ),
    [socialState.friends, profileMap]
  )

  const incomingRequests = useMemo(
    () =>
      socialState.incomingRequests
        .map((id) => profileMap.get(id))
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile)
        ),
    [socialState.incomingRequests, profileMap]
  )

  const outgoingRequests = useMemo(
    () =>
      socialState.outgoingRequests
        .map((id) => profileMap.get(id))
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile)
        ),
    [socialState.outgoingRequests, profileMap]
  )

  const discoverableUsers = useMemo(() => {
    const blockedIds = new Set([
      ...socialState.friends,
      ...socialState.incomingRequests,
      ...socialState.outgoingRequests
    ])

    const normalizedQuery = searchQuery.trim().toLowerCase()
    return friendProfiles.filter((profile) => {
      if (blockedIds.has(profile.id)) return false
      if (!normalizedQuery) return true
      return (
        profile.name.toLowerCase().includes(normalizedQuery) ||
        profile.username.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [searchQuery, socialState])

  const compareFriend = useMemo(
    () => profileMap.get(Number(compareFriendId)),
    [compareFriendId, profileMap]
  )

  const updateState = useCallback(
    (updater: (prev: SocialState) => SocialState) => {
      setSocialState((prev) => updater(prev))
    },
    [setSocialState]
  )

  const sendFriendRequest = useCallback(
    (friendId: number) => {
      updateState((prev) => ({
        ...prev,
        outgoingRequests: Array.from(
          new Set([...prev.outgoingRequests, friendId])
        )
      }))
    },
    [updateState]
  )

  const acceptRequest = useCallback(
    (friendId: number) => {
      updateState((prev) => ({
        ...prev,
        incomingRequests: prev.incomingRequests.filter((id) => id !== friendId),
        friends: Array.from(new Set([...prev.friends, friendId]))
      }))
    },
    [updateState]
  )

  const declineRequest = useCallback(
    (friendId: number) => {
      updateState((prev) => ({
        ...prev,
        incomingRequests: prev.incomingRequests.filter((id) => id !== friendId)
      }))
    },
    [updateState]
  )

  const cancelRequest = useCallback(
    (friendId: number) => {
      updateState((prev) => ({
        ...prev,
        outgoingRequests: prev.outgoingRequests.filter((id) => id !== friendId)
      }))
    },
    [updateState]
  )

  const inviteFriend = useCallback(
    (friendId: number) => {
      const quizId = inviteSelections[friendId]
      if (!quizId) return

      updateState((prev) => ({
        ...prev,
        invitations: [
          {
            id: `${friendId}-${quizId}-${Date.now()}`,
            friendId,
            quizId,
            sentAt: new Date().toISOString()
          },
          ...prev.invitations
        ]
      }))
    },
    [inviteSelections, updateState]
  )

  return (
    <main className='min-h-screen p-4 md:p-8 lg:p-12 text-foreground'>
      <header className='mb-8'>
        <h1 className='text-3xl font-bold'>Friends & Social</h1>
        <p className='text-foreground/70 mt-2'>
          Find friends, manage requests, invite friends to quizzes, and compare
          your stats.
        </p>
      </header>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <Card className='xl:col-span-1'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Search className='w-5 h-5' />
              Find Friends
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search by name or username'
              aria-label='Search users to add as friends'
            />

            <div className='space-y-3'>
              {discoverableUsers.length === 0 ? (
                <p className='text-sm text-foreground/60'>No users found.</p>
              ) : (
                discoverableUsers.map((user) => (
                  <div
                    key={user.id}
                    className='flex items-center justify-between border border-border rounded-md p-3'
                  >
                    <div className='flex items-center gap-3'>
                      <Avatar className='w-9 h-9'>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='font-medium text-sm'>{user.name}</p>
                        <p className='text-xs text-foreground/60'>
                          {user.username}
                        </p>
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => sendFriendRequest(user.id)}
                    >
                      <UserPlus className='w-4 h-4 mr-1' />
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='xl:col-span-2'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='w-5 h-5' />
              Friend Requests
            </CardTitle>
          </CardHeader>
          <CardContent className='grid md:grid-cols-2 gap-6'>
            <div>
              <h3 className='text-sm font-semibold mb-3'>Incoming</h3>
              <div className='space-y-3'>
                {incomingRequests.length === 0 ? (
                  <p className='text-sm text-foreground/60'>
                    No incoming requests.
                  </p>
                ) : (
                  incomingRequests.map((user) => (
                    <div
                      key={user.id}
                      className='border border-border rounded-md p-3 space-y-2'
                    >
                      <p className='font-medium text-sm'>{user.name}</p>
                      <p className='text-xs text-foreground/60'>
                        {user.username}
                      </p>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => acceptRequest(user.id)}
                        >
                          <Check className='w-4 h-4 mr-1' />
                          Accept
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => declineRequest(user.id)}
                        >
                          <X className='w-4 h-4 mr-1' />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className='text-sm font-semibold mb-3'>Sent</h3>
              <div className='space-y-3'>
                {outgoingRequests.length === 0 ? (
                  <p className='text-sm text-foreground/60'>
                    No sent requests.
                  </p>
                ) : (
                  outgoingRequests.map((user) => (
                    <div
                      key={user.id}
                      className='border border-border rounded-md p-3 space-y-2'
                    >
                      <p className='font-medium text-sm'>{user.name}</p>
                      <p className='text-xs text-foreground/60'>
                        {user.username}
                      </p>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => cancelRequest(user.id)}
                      >
                        Cancel Request
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='xl:col-span-2'>
          <CardHeader>
            <CardTitle>Friends List & Quiz Invites</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {friends.length === 0 ? (
              <p className='text-sm text-foreground/60'>No friends yet.</p>
            ) : (
              friends.map((friend) => {
                const lastInvite = socialState.invitations.find(
                  (invite) => invite.friendId === friend.id
                )
                const invitedQuiz = quizOptions.find(
                  (quiz) => quiz.id === lastInvite?.quizId
                )

                return (
                  <div
                    key={friend.id}
                    className='border border-border rounded-md p-3'
                  >
                    <div className='flex items-center justify-between gap-3 mb-3'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='w-10 h-10'>
                          <AvatarImage src={friend.avatar} alt={friend.name} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className='font-medium text-sm'>{friend.name}</p>
                          <p className='text-xs text-foreground/60'>
                            {friend.username}
                          </p>
                        </div>
                      </div>
                      <Badge variant='outline' className='capitalize'>
                        <span
                          className={`w-2 h-2 rounded-full mr-2 ${statusClassMap[friend.onlineStatus]}`}
                        />
                        {friend.onlineStatus}
                      </Badge>
                    </div>

                    <div className='flex flex-col md:flex-row gap-2 md:items-center'>
                      <Select
                        value={inviteSelections[friend.id] ?? ''}
                        onValueChange={(value) =>
                          setInviteSelections((prev) => ({
                            ...prev,
                            [friend.id]: value
                          }))
                        }
                      >
                        <SelectTrigger className='w-full md:w-72'>
                          <SelectValue placeholder='Choose quiz to invite' />
                        </SelectTrigger>
                        <SelectContent>
                          {quizOptions.map((quiz) => (
                            <SelectItem key={quiz.id} value={quiz.id}>
                              {quiz.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => inviteFriend(friend.id)}
                        disabled={!inviteSelections[friend.id]}
                      >
                        <Send className='w-4 h-4 mr-1' />
                        Invite to Quiz
                      </Button>
                    </div>

                    {lastInvite && invitedQuiz && (
                      <p className='text-xs text-foreground/60 mt-2'>
                        Last invite: {invitedQuiz.title}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className='xl:col-span-1'>
          <CardHeader>
            <CardTitle>Compare Stats</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Select value={compareFriendId} onValueChange={setCompareFriendId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select a friend' />
              </SelectTrigger>
              <SelectContent>
                {friends.map((friend) => (
                  <SelectItem key={friend.id} value={String(friend.id)}>
                    {friend.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {compareFriend ? (
              <div className='space-y-3 text-sm'>
                <div className='border border-border rounded-md p-3'>
                  <p className='font-semibold mb-2'>Quizzes Played</p>
                  <p>You: {currentUserStats.quizzesPlayed}</p>
                  <p>
                    {compareFriend.name}: {compareFriend.stats.quizzesPlayed}
                  </p>
                </div>
                <div className='border border-border rounded-md p-3'>
                  <p className='font-semibold mb-2'>Average Score</p>
                  <p>You: {currentUserStats.averageScore}%</p>
                  <p>
                    {compareFriend.name}: {compareFriend.stats.averageScore}%
                  </p>
                </div>
                <div className='border border-border rounded-md p-3'>
                  <p className='font-semibold mb-2'>Win Rate</p>
                  <p>You: {currentUserStats.winRate}%</p>
                  <p>
                    {compareFriend.name}: {compareFriend.stats.winRate}%
                  </p>
                </div>
              </div>
            ) : (
              <p className='text-sm text-foreground/60'>
                Select a friend to compare your stats.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
})

export default FriendsPage
