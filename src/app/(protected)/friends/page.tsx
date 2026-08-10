'use client'

/**
 * `/friends` — authenticated social-graph management surface.
 *
 * Phase 2 (F-05 / F-21) rewrite. The previous implementation was a
 * localStorage-only mock (`features/users/constants/friends.ts`).
 * This rewrite consumes the live social hooks from
 * `features/social/hooks`:
 *
 *   - `useFriends` (TKT-6.1.D3)          — viewer's friends list
 *   - `useIncomingRequests` (TKT-6.1.D3) — viewer's incoming requests
 *   - `useOutgoingRequests` (TKT-6.1.D3) — viewer's sent requests
 *   - `useUserSearch` (TKT-6.5.D2)       — debounced user search
 *   - `useSendFriendRequest` (TKT-6.8.D1)
 *   - `useRespondFriendRequest` (TKT-6.8.D2)
 *   - `useCancelFriendRequest` (TKT-6.8.D3)
 *   - `useUnfriend` (TKT-6.8.D4)
 *   - `useUserSocialStats` (TKT-6.3.D1)  — privacy-aware per-user stats
 *
 * Plus the Phase 1 wires:
 *   - `useMyAnalytics` for "You" stats in Compare Stats (F-22)
 *   - `useQuizInviteOptions` for the invite dropdown (F-20)
 *
 * No localStorage. No `friendProfiles` / `defaultSocialState`.
 *
 * Implementation note: the mutation hooks are per-target, so each
 * row owns its own hook instance via a small row-level component.
 * The page itself owns only the read hooks and orchestrates state
 * passed down to the row components.
 */

import { memo, useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'
import { useUser } from '@/features/users/store/user-store'
import useSWR from 'swr'
import { listQuizzes } from '@/features/quizzes/services/quizzes.service'
import { useMyAnalytics } from '@/features/users/hooks/useMyAnalytics'

import {
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
  useSendFriendRequest,
  useRespondFriendRequest,
  useCancelFriendRequest,
  useUnfriend,
  useUserSocialStats
} from '@/features/social/hooks'

// `useUserSearch` is not yet in the social hooks barrel — import
// directly. (See TKT-6.5.D2; barrel update is out of scope here.)
import { useUserSearch } from '@/features/social/hooks/useUserSearch'

import type { SocialFriendRequestDto, SocialUserSummaryDto } from '@/features/social/types'
import type { SearchableUserDto } from '@/lib/api/generated/schemas/searchableUserDto'

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Coerce a loosely-typed avatar URL field into a string. The
 * generated `SearchableUserDto.avatarUrl` is typed as
 * `{ [key: string]: unknown } | null` (free-form), but the runtime
 * value is always a plain URL string. We extract defensively so the
 * page does not blow up if the backend ever sends something
 * unexpected.
 */
function coerceAvatarSrc(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  return undefined
}

/**
 * Best-effort display name. Search results expose `displayName`
 * (`SearchableUserDto`), while friends-list rows expose
 * `displayName` on `SocialUserSummaryDto`. Incoming/outgoing
 * requests wrap the same summary under `.requester`. We normalise
 * to "username" when nothing better is available.
 *
 * The DTOs use different types for `displayName` (`string` on
 * `SocialUserSummaryDto`, `{ [key: string]: unknown } | null` on
 * the generated `SearchableUserDto`). We accept `unknown` and
 * stringify defensively rather than coupling the helper to a
 * specific wire shape.
 */
function displayNameOf(input: {
  displayName?: unknown
  username?: string | null
  userName?: string | null
}): string {
  if (typeof input.displayName === 'string' && input.displayName.trim().length > 0) {
    return input.displayName
  }
  const userName = input.userName ?? input.username
  return userName ?? 'Unknown user'
}

// ─── Quiz invite options (F-20 — Phase 1) ────────────────────────────────

type QuizInviteOption = { id: string; title: string }

function useQuizInviteOptions(): QuizInviteOption[] {
  const { data } = useSWR(
    ['friends', 'quiz-invite-options'] as const,
    async () => {
      const result = await listQuizzes({ limit: 12 })
      const items = ((result as { data?: Array<{ quizId: string; title: string; isHidden?: boolean }> })
        .data ?? [])
      return items
        .filter((item) => item.isHidden !== true)
        .slice(0, 12)
        .map((item) => ({ id: item.quizId, title: item.title }))
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  )
  return data ?? []
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [compareFriendId, setCompareFriendId] = useState<string>('')
  const [inviteSelections, setInviteSelections] = useState<
    Record<string, string>
  >({})

  const user = useUser()
  const quizOptions = useQuizInviteOptions()
  const viewerUserId = user?.userId ?? null

  // Live read hooks — replace the old localStorage state.
  const friendsHook = useFriends(viewerUserId)
  const incomingHook = useIncomingRequests()
  const outgoingHook = useOutgoingRequests()
  const searchHook = useUserSearch(searchQuery)

  const { analytics: myAnalytics } = useMyAnalytics()

  const friends = friendsHook.users
  const incomingRequests = incomingHook.requests
  const outgoingRequests = outgoingHook.requests

  // ── Compare stats (friend side) ───────────────────────────────────────
  const compareFriend = useMemo(
    () => friends.find((f) => f.userId === compareFriendId) ?? null,
    [friends, compareFriendId],
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
        {/* ─── Find Friends ──────────────────────────────────────────── */}
        <Card className='xl:col-span-1'>
          <CardHeader>
            <CardTitle>Find Friends</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search by username'
              aria-label='Search users to add as friends'
            />

            <SearchResultsPanel
              isLoading={searchHook.isLoading}
              isStale={searchHook.isStale}
              error={searchHook.error}
              isRateLimited={searchHook.isRateLimited}
              remainingSeconds={searchHook.remainingSeconds}
              hasQuery={searchQuery.trim().length > 0}
              items={searchHook.items}
            />
          </CardContent>
        </Card>

        {/* ─── Friend Requests ──────────────────────────────────────── */}
        <Card className='xl:col-span-2'>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className='grid md:grid-cols-2 gap-6'>
            <RequestsPanel
              title='Incoming'
              emptyLabel='No incoming requests.'
              isLoading={incomingHook.isLoading}
              error={incomingHook.error}
              retry={incomingHook.retry}
              requests={incomingRequests}
              kind='incoming'
            />

            <RequestsPanel
              title='Sent'
              emptyLabel='No sent requests.'
              isLoading={outgoingHook.isLoading}
              error={outgoingHook.error}
              retry={outgoingHook.retry}
              requests={outgoingRequests}
              kind='outgoing'
            />
          </CardContent>
        </Card>

        {/* ─── Friends List & Quiz Invites ──────────────────────────── */}
        <Card className='xl:col-span-2'>
          <CardHeader>
            <CardTitle>Friends List & Quiz Invites</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <FriendsListPanel
              isLoading={friendsHook.isLoading}
              error={friendsHook.error}
              retry={friendsHook.retry}
              friends={friends}
              inviteSelections={inviteSelections}
              onSelectQuiz={(friendId, quizId) =>
                setInviteSelections((prev) => ({
                  ...prev,
                  [friendId]: quizId,
                }))
              }
              quizOptions={quizOptions}
            />
          </CardContent>
        </Card>

        {/* ─── Compare Stats ────────────────────────────────────────── */}
        <Card className='xl:col-span-1'>
          <CardHeader>
            <CardTitle>Compare Stats</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {friends.length === 0 ? (
              <p className='text-sm text-foreground/70'>
                Add a friend to start comparing stats.
              </p>
            ) : (
              <Select
                value={compareFriendId}
                onValueChange={setCompareFriendId}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a friend' />
                </SelectTrigger>
                <SelectContent>
                  {friends.map((friend) => (
                    <SelectItem key={friend.userId} value={friend.userId}>
                      {displayNameOf(friend)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {compareFriend ? (
              <CompareStatsPanel
                friend={compareFriend}
                myAnalytics={myAnalytics}
                myAnalyticsLoading={!myAnalytics}
                viewerLabel={user?.displayName ?? user?.username ?? 'You'}
              />
            ) : friends.length > 0 ? (
              <p className='text-sm text-foreground/70'>
                Select a friend to compare your stats.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ─── Sub-panels (kept local — small, single-purpose) ──────────────────────

interface SearchResultsPanelProps {
  isLoading: boolean
  isStale: boolean
  error: { code?: string; message?: string } | null
  isRateLimited: boolean
  remainingSeconds: number
  hasQuery: boolean
  items: ReadonlyArray<SearchableUserDto>
}

const SearchResultsPanel = memo(function SearchResultsPanel({
  isLoading,
  isStale,
  error,
  isRateLimited,
  remainingSeconds,
  hasQuery,
  items,
}: SearchResultsPanelProps) {
  if (!hasQuery) {
    return (
      <p className='text-sm text-foreground/70'>
        Start typing to search for people on the platform.
      </p>
    )
  }

  if (isLoading && items.length === 0) {
    return (
      <p className='text-sm text-foreground/70' role='status'>
        Searching…
      </p>
    )
  }

  if (error) {
    return (
      <p className='text-sm text-foreground/70' role='alert'>
        Search failed. Try again in a moment.
      </p>
    )
  }

  if (isRateLimited) {
    return (
      <p className='text-sm text-foreground/70' role='status'>
        Rate limited — try again in {remainingSeconds}s.
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className='text-sm text-foreground/70' role='status'>
        No matching users.
      </p>
    )
  }

  return (
    <ul className='space-y-3' aria-busy={isStale}>
      {items.map((user) => (
        <SearchResultRow key={user.userId} user={user} />
      ))}
    </ul>
  )
})

/**
 * Per-row component so each row can hold its own
 * `useSendFriendRequest(targetUserId)` hook instance.
 */
const SearchResultRow = memo(function SearchResultRow({
  user,
}: {
  user: SearchableUserDto
}) {
  const mut = useSendFriendRequest(user.userId)
  const name = displayNameOf(user)
  const canSend = !user.isFriend && !user.hasPendingRequest && !user.isBlocked
  const statusLabel = user.isFriend
    ? 'Friends'
    : user.hasPendingRequest
      ? 'Pending'
      : user.isBlocked
        ? 'Blocked'
        : 'Add'

  return (
    <li className='flex items-center justify-between border border-border rounded-md p-3'>
      <div className='flex items-center gap-3 min-w-0'>
        <Avatar className='w-9 h-9'>
          <AvatarImage src={coerceAvatarSrc(user.avatarUrl)} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='font-medium text-sm truncate'>{name}</p>
          <p className='text-xs text-foreground/70 truncate'>
            @{user.username}
          </p>
        </div>
      </div>
      <Button
        size='sm'
        variant='outline'
        onClick={mut.send}
        disabled={!canSend || mut.isPending}
        aria-label={
          user.isFriend
            ? `Already friends with ${name}`
            : user.hasPendingRequest
              ? `Request already pending for ${name}`
              : user.isBlocked
                ? `${name} is blocked`
                : `Send friend request to ${name}`
        }
      >
        {statusLabel}
      </Button>
    </li>
  )
})

interface RequestsPanelProps {
  title: string
  emptyLabel: string
  isLoading: boolean
  error: { code?: string; message?: string } | null
  retry: () => Promise<void> | void
  requests: ReadonlyArray<SocialFriendRequestDto>
  kind: 'incoming' | 'outgoing'
}

const RequestsPanel = memo(function RequestsPanel({
  title,
  emptyLabel,
  isLoading,
  error,
  retry,
  requests,
  kind,
}: RequestsPanelProps) {
  return (
    <div>
      <h3 className='text-sm font-semibold mb-3'>{title}</h3>
      {isLoading && requests.length === 0 ? (
        <p className='text-sm text-foreground/70' role='status'>
          Loading…
        </p>
      ) : error ? (
        <div className='space-y-2'>
          <p className='text-sm text-foreground/70' role='alert'>
            Failed to load {title.toLowerCase()}.
          </p>
          <Button size='sm' variant='outline' onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <p className='text-sm text-foreground/70'>{emptyLabel}</p>
      ) : (
        <ul className='space-y-3'>
          {requests.map((req) => (
            <RequestRow key={req.id} request={req} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  )
})

/**
 * Per-row component so each row can hold its own mutation hook
 * (`useRespondFriendRequest` for incoming, `useCancelFriendRequest`
 * for outgoing) keyed by the row's requester id.
 */
const RequestRow = memo(function RequestRow({
  request,
  kind,
}: {
  request: SocialFriendRequestDto
  kind: 'incoming' | 'outgoing'
}) {
  const name = displayNameOf(request.requester)
  return (
    <li className='border border-border rounded-md p-3 space-y-2'>
      <div className='flex items-center gap-3'>
        <Avatar className='w-9 h-9'>
          <AvatarImage
            src={request.requester.avatarUrl ?? undefined}
            alt={name}
          />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className='font-medium text-sm'>{name}</p>
          <p className='text-xs text-foreground/70'>
            @{request.requester.userName}
          </p>
        </div>
      </div>
      {kind === 'incoming' ? (
        <IncomingRequestActions request={request} name={name} />
      ) : (
        <OutgoingRequestActions request={request} name={name} />
      )}
    </li>
  )
})

function IncomingRequestActions({
  request,
  name,
}: {
  request: SocialFriendRequestDto
  name: string
}) {
  const mut = useRespondFriendRequest(request.requesterId)
  return (
    <div className='flex gap-2'>
      <Button
        size='sm'
        onClick={() =>
          mut.respond({ friendshipId: request.id, action: 'accept' })
        }
        disabled={mut.isPending}
        aria-label={`Accept friend request from ${name}`}
      >
        Accept
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() =>
          mut.respond({ friendshipId: request.id, action: 'decline' })
        }
        disabled={mut.isPending}
        aria-label={`Decline friend request from ${name}`}
      >
        Decline
      </Button>
    </div>
  )
}

function OutgoingRequestActions({
  request,
  name,
}: {
  request: SocialFriendRequestDto
  name: string
}) {
  const mut = useCancelFriendRequest(request.addresseeId)
  return (
    <Button
      size='sm'
      variant='outline'
      onClick={() => mut.cancel(request.id)}
      disabled={mut.isPending || mut.alreadyCancelled}
      aria-label={`Cancel friend request to ${name}`}
    >
      {mut.alreadyCancelled ? 'Already cancelled' : 'Cancel Request'}
    </Button>
  )
}

interface FriendsListPanelProps {
  isLoading: boolean
  error: { code?: string; message?: string } | null
  retry: () => Promise<void> | void
  friends: ReadonlyArray<SocialUserSummaryDto>
  inviteSelections: Record<string, string>
  onSelectQuiz: (friendId: string, quizId: string) => void
  quizOptions: ReadonlyArray<{ id: string; title: string }>
}

const FriendsListPanel = memo(function FriendsListPanel({
  isLoading,
  error,
  retry,
  friends,
  inviteSelections,
  onSelectQuiz,
  quizOptions,
}: FriendsListPanelProps) {
  if (isLoading && friends.length === 0) {
    return (
      <p className='text-sm text-foreground/70' role='status'>
        Loading friends…
      </p>
    )
  }
  if (error) {
    return (
      <div className='space-y-2'>
        <p className='text-sm text-foreground/70' role='alert'>
          Failed to load friends.
        </p>
        <Button size='sm' variant='outline' onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    )
  }
  if (friends.length === 0) {
    return (
      <p className='text-sm text-foreground/70'>
        No friends yet. Use Find Friends to add some.
      </p>
    )
  }
  return (
    <ul className='space-y-3'>
      {friends.map((friend) => (
        <FriendRow
          key={friend.userId}
          friend={friend}
          selection={inviteSelections[friend.userId] ?? ''}
          onSelectQuiz={(quizId) => onSelectQuiz(friend.userId, quizId)}
          quizOptions={quizOptions}
        />
      ))}
    </ul>
  )
})

const FriendRow = memo(function FriendRow({
  friend,
  selection,
  onSelectQuiz,
  quizOptions,
}: {
  friend: SocialUserSummaryDto
  selection: string
  onSelectQuiz: (quizId: string) => void
  quizOptions: ReadonlyArray<{ id: string; title: string }>
}) {
  const name = displayNameOf(friend)
  return (
    <li className='border border-border rounded-md p-3 space-y-3'>
      <div className='flex items-center gap-3'>
        <Avatar className='w-10 h-10'>
          <AvatarImage src={friend.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='font-medium text-sm truncate'>{name}</p>
          <p className='text-xs text-foreground/70 truncate'>
            @{friend.userName}
          </p>
        </div>
      </div>
      <div className='flex flex-col md:flex-row gap-2 md:items-center'>
        <Select value={selection} onValueChange={onSelectQuiz}>
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
      </div>
    </li>
  )
})

interface CompareStatsPanelProps {
  friend: SocialUserSummaryDto
  myAnalytics: {
    xpTotal: number
    quizzesCompleted: number
    averageScore: number
    totalTimeSpentMinutes: number
    currentStreak: number
    longestStreak: number
    tournamentsPlayed: number
    tournamentsWon: number
  } | null
  myAnalyticsLoading: boolean
  viewerLabel: string
}

const CompareStatsPanel = memo(function CompareStatsPanel({
  friend,
  myAnalytics,
  myAnalyticsLoading,
  viewerLabel,
}: CompareStatsPanelProps) {
  const name = displayNameOf(friend)
  const statsHook = useUserSocialStats(friend.userId)
  const unfriendMut = useUnfriend(friend.userId)

  return (
    <div className='space-y-3 text-sm'>
      <CompareRow
        label='Quizzes Played'
        youValue={
          myAnalyticsLoading
            ? null
            : myAnalytics
              ? myAnalytics.quizzesCompleted.toLocaleString()
              : null
        }
        themLabel={name}
        themValue={
          statsHook.stats
            ? // Backend exposes social-graph counts on
              // `SocialUserStatsDto`, not per-quiz analytics. We
              // surface friend count as a stand-in activity
              // signal; true per-quiz analytics for other users
              // is not yet exposed (F-22 partial).
              `${statsHook.stats.friends} connections`
            : null
        }
      />
      <CompareRow
        label='Average Score'
        youValue={
          myAnalyticsLoading
            ? null
            : myAnalytics
              ? `${myAnalytics.averageScore.toFixed(1)}%`
              : null
        }
        themLabel={name}
        themValue='Private'
      />
      <CompareRow
        label='Win Rate'
        youValue={
          <span aria-label='Win rate not available yet'>—</span>
        }
        themLabel={name}
        themValue={
          statsHook.stats ? `${statsHook.stats.followers} followers` : null
        }
      />
      <CompareRow
        label='Longest Streak'
        youValue={
          myAnalyticsLoading
            ? null
            : myAnalytics
              ? `${myAnalytics.longestStreak} days`
              : null
        }
        themLabel={name}
        themValue='Private'
      />
      {statsHook.isLoading && (
        <p className='text-xs text-foreground/70'>Loading friend stats…</p>
      )}
      {unfriendMut.isPending && (
        <p className='text-xs text-foreground/70'>Unfriending…</p>
      )}
      <Button
        size='sm'
        variant='outline'
        onClick={unfriendMut.unfriend}
        disabled={unfriendMut.isPending || unfriendMut.alreadyNotFriends}
        aria-label={`Unfriend ${name}`}
      >
        Unfriend
      </Button>
      <p className='text-xs text-foreground/70'>{viewerLabel} vs {name}</p>
    </div>
  )
})

interface CompareRowProps {
  label: string
  youValue: string | React.ReactNode | null
  themLabel: string
  themValue: string | React.ReactNode | null
}

const CompareRow = memo(function CompareRow({
  label,
  youValue,
  themLabel,
  themValue,
}: CompareRowProps) {
  return (
    <div className='border border-border rounded-md p-3'>
      <p className='font-semibold mb-2'>{label}</p>
      <p>
        You: {youValue ?? <span aria-label={`${label} not available`}>—</span>}
      </p>
      <p>
        {themLabel}:{' '}
        {themValue ?? <span aria-label={`${themLabel} ${label} not available`}>—</span>}
      </p>
    </div>
  )
})
