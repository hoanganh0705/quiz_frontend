'use client'

/**
 * `FindFriendsPopup` — live modal showing the viewer's friend
 * suggestions.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `FindFriendsPopup`.
 *
 * The previous version embedded `mockFriends` (a hardcoded `Friend[]`
 * with Emma Wilson, David Park, Lisa Chen, James Rodriguez). The
 * popup now reads from `useSuggestions('me')` (Story 6.5 / TKT-6.5.C2)
 * which calls the social suggestions endpoint.
 *
 * ## Auth gating
 *
 * The suggestions endpoint is auth-only. Anonymous viewers see a
 * "Sign in to see friend suggestions" message instead of an empty
 * list (which used to be the failure mode of the mock-driven
 * version).
 *
 * ## Privacy
 *
 * `useSuggestions` returns a `visibility` discriminator:
 *   - `blocked_by_viewer` / `blocked_viewer` / `private` /
 *     `not_found` → render a privacy notice.
 *   - `visible` → render the list.
 *
 * The hook is the single source of truth for the privacy mapping
 * (the documented Story 6.5 contract);
 * `resolveSuggestionsVisibility` is the canonical resolver.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Search, UserPlus, Users } from 'lucide-react'
import Image from 'next/image'

import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import { useSuggestions } from '@/features/social/hooks/useSuggestions'
import type { SocialSuggestionItemDto } from '@/features/social/types'

interface FindFriendsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function FindFriendsPopup({ isOpen, onClose }: FindFriendsPopupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { isAuthenticated } = useAuthState()

  // Radix Dialog mounts the children even when the dialog is closed
  // (visibility is driven by CSS, not unmount). To avoid firing the
  // suggestions endpoint in the background — and, more importantly,
  // to avoid hammering it during the brief Strict-Mode double-mount
  // window — only call `useSuggestions` while the popup is open.
  // The hook's SWR cache key still survives re-opens, so a single
  // open-then-close cycle is enough to populate the list.
  const suggestionsTarget = isOpen && isAuthenticated ? 'me' : null
  const {
    items,
    isLoading,
    visibility,
    error,
    retry,
  } = useSuggestions(suggestionsTarget)

  const filtered: readonly SocialSuggestionItemDto[] = searchQuery
    ? items.filter((s) =>
        s.user.userName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='bg-background border-border text-foreground max-w-2xl max-h-[80vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Users className='w-5 h-5' />
            Find Friends
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Search Bar */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              placeholder='Search by username...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label='Search suggestions'
              className='pl-10 w-full bg-muted border border-border text-foreground placeholder:text-muted-foreground rounded-md h-9 px-3 text-sm'
            />
          </div>

          {/* Content */}
          {!isAuthenticated ? (
            <div className='text-center py-8 text-foreground-secondary space-y-2'>
              <Users className='w-12 h-12 mx-auto opacity-50' aria-hidden='true' />
              <p>Sign in to see friend suggestions</p>
            </div>
          ) : visibility !== 'visible' ? (
            <PrivacyNotice visibility={visibility} onRetry={retry} />
          ) : isLoading && items.length === 0 ? (
            <div className='text-center py-8 text-foreground-secondary'>
              <p>Loading suggestions…</p>
            </div>
          ) : error ? (
            <div className='text-center py-8 text-foreground-secondary space-y-2'>
              <p>Could not load suggestions.</p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  void retry()
                }}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className='text-center py-8 text-foreground-secondary space-y-2'>
              <Users className='w-12 h-12 mx-auto opacity-50' aria-hidden='true' />
              <p>
                {searchQuery
                  ? `No suggestions matching "${searchQuery}"`
                  : 'No suggestions right now — check back later.'}
              </p>
            </div>
          ) : (
            <div className='space-y-3 max-h-96 overflow-y-auto'>
              {filtered.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.user.userId}
                  suggestion={suggestion}
                />
              ))}
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-border'>
          <Button
            variant='outline'
            onClick={onClose}
            className='border-border text-muted-foreground hover:bg-accent'
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Privacy notice ─────────────────────────────────────────────────────

interface PrivacyNoticeProps {
  visibility: string
  onRetry: () => Promise<void>
}

function PrivacyNotice({ visibility, onRetry }: PrivacyNoticeProps) {
  let message: string
  switch (visibility) {
    case 'blocked_by_viewer':
      message = 'You blocked some of these users — unblock to see them again.'
      break
    case 'blocked_viewer':
      message = 'Some of these users blocked you.'
      break
    case 'private':
      message = 'Your friend list is private. Update your privacy settings to see suggestions.'
      break
    case 'not_found':
      message = 'No suggestions available.'
      break
    default:
      message = 'Suggestions are unavailable right now.'
  }
  return (
    <div className='text-center py-8 text-foreground-secondary space-y-2'>
      <p>{message}</p>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          void onRetry()
        }}
      >
        Retry
      </Button>
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────

interface SuggestionRowProps {
  suggestion: SocialSuggestionItemDto
}

function SuggestionRow({ suggestion }: SuggestionRowProps) {
  const avatarSrc = suggestion.user.avatarUrl ?? '/placeholder.svg'
  const displayName =
    suggestion.user.displayName ?? `@${suggestion.user.userName}`
  return (
    <div className='flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-accent transition-colors'>
      <div className='flex items-center gap-3'>
        <div className='w-12 h-12 rounded-full overflow-hidden'>
          <Image
            src={avatarSrc}
            alt={suggestion.user.userName}
            width={48}
            height={48}
            loading='eager'
            priority
            className='w-full h-full object-cover'
          />
        </div>
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <h3 className='font-semibold text-foreground'>{displayName}</h3>
          </div>
          <div className='flex items-center gap-3 mt-1'>
            {suggestion.mutualFriendsCount > 0 ? (
              <span className='text-xs text-muted-foreground'>
                {suggestion.mutualFriendsCount} mutual friend
                {suggestion.mutualFriendsCount === 1 ? '' : 's'}
              </span>
            ) : null}
            <Badge className='bg-muted-foreground text-xs'>
              {suggestion.reason}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        size='sm'
        className='bg-primary hover:bg-primary text-primary-foreground'
        type='button'
      >
        <UserPlus className='w-4 h-4 mr-1' aria-hidden='true' />
        Follow
      </Button>
    </div>
  )
}
