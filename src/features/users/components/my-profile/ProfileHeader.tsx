'use client'

import { useState, useCallback, memo } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { AvatarImage } from '@/components/ui/Avatar'
import { AvatarFallback } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogContent } from '@/components/ui/Dialog'
import { DialogDescription } from '@/components/ui/Dialog'
import { DialogFooter } from '@/components/ui/Dialog'
import { DialogHeader } from '@/components/ui/Dialog'
import { DialogTitle } from '@/components/ui/Dialog'
import {
  Edit,
  Calendar,
  Share2,
  Settings,
  Check,
  Copy,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { UserMeResponseDto } from '@/features/users/types'
import type { UserSummaryResponseDto } from '@/lib/api/generated/schemas'
import { useClipboard } from '@/shared/hooks'

interface ProfileHeaderProps {
  user: UserMeResponseDto
  summary?: UserSummaryResponseDto | null
  joinedAt?: string | null
}

export const ProfileHeader = memo(function ProfileHeader({
  user,
  summary,
  joinedAt,
}: ProfileHeaderProps) {

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const { copied, copy } = useClipboard(2000)

  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${user.username}`
      : `/profile/${user.username}`

  const displayName =
    user.displayName ?? user.username ?? user.email ?? 'User'

  const handleShare = useCallback(async () => {

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s Profile`,
          text: `Check out ${displayName}'s profile on Quiz App!`,
          url: profileUrl
        })
        return
      } catch (error) {

        if ((error as Error).name === 'AbortError') return
      }
    }

    setIsShareDialogOpen(true)
  }, [displayName, profileUrl])

  const handleCopyLink = useCallback(() => {
    copy(profileUrl)
  }, [copy, profileUrl])

  return (
    <>
      <div className='border border-border rounded-2xl mt-6 overflow-hidden'>
          {/* Cover Image */}
          <section
            aria-label='Cover image'
            className='relative h-32 bg-linear-to-r from-default/30 via-default/20 to-default/10'
          >
            {summary?.bgImageUrl && (
              <Image
                src={summary?.bgImageUrl || ''}
                alt='Profile cover'
                fill
                className='object-cover'
                priority
              />
            )}
          </section>

{/* Profile Info */}
<div className='px-8 pb-6'>
<div className='flex flex-col md:flex-row items-start justify-between gap-6'>
{/* Avatar & Info */}
<div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
                <div className='relative -mt-12'>
                  <Avatar className='h-24 w-24 border-4 border-main'>
                    {user.avatarUrl && (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={`${displayName}'s avatar`}
                      />
                    )}
                    <AvatarFallback className='text-2xl'>
                      {displayName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                </div>

<div className='flex-1 pt-2'>
<div className='flex flex-wrap items-center gap-3 mb-2'>
<h1 className='text-2xl font-bold text-foreground'>
{displayName}
</h1>
</div>

<div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
<span>@{user.username}</span>
{joinedAt && (
<span className='flex items-center gap-1'>
<Calendar className='w-3 h-3' aria-hidden='true' />
Joined{' '}
{new Date(joinedAt).toLocaleDateString('en-US', {
month: 'long',
day: 'numeric',
year: 'numeric',
                      })}
</span>
                  )}
</div>

{summary && (
<p className='text-muted-foreground mb-4 text-sm max-w-xl'>
{summary.levelTitleLocalised}
</p>
                )}

{/* Quick Stats */}
<div className='flex flex-wrap gap-6 text-sm'>
{summary?.quizzesTaken !== undefined && (
<div>
<span className='text-foreground font-bold'>
{summary.quizzesTaken}
</span>
<span className='text-muted-foreground ml-1'>
Quizzes Taken
                      </span>
</div>
                  )}
{summary?.quizzesCreated !== undefined && (
<div>
<span className='text-foreground font-bold'>
{summary.quizzesCreated}
</span>
<span className='text-muted-foreground ml-1'>
Quizzes Created
                      </span>
</div>
                  )}
{summary?.followers !== undefined && (
<div>
<span className='text-foreground font-bold'>
{summary.followers}
</span>
<span className='text-muted-foreground ml-1'>
Followers
                      </span>
</div>
                  )}
{summary?.following !== undefined && (
<div>
<span className='text-foreground font-bold'>
{summary.following}
</span>
<span className='text-muted-foreground ml-1'>
Following
                      </span>
</div>
                  )}
</div>
</div>
</div>

{/* Action Buttons */}
<div
className='flex gap-3 self-start mt-4 md:mt-0 pt-2'
role='toolbar'
aria-label='Profile actions'
            >
<Button className='gap-2' asChild>
<Link href='/settings' aria-label='Edit profile'>
<Edit className='w-4 h-4' aria-hidden='true' />
Edit Profile
                </Link>
</Button>
<Button
variant='outline'
className='gap-2 text-primary'
onClick={handleShare}
aria-label='Share profile'
              >
<Share2 className='w-4 h-4' aria-hidden='true' />
Share
              </Button>
<Button size='icon' asChild>
<Link href='/settings' aria-label='Account settings'>
<Settings className='w-4 h-4' aria-hidden='true' />
</Link>
</Button>
</div>
</div>
</div>
</div>

{/* Share Dialog */}
<Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
<DialogContent className='sm:max-w-md'>
<DialogHeader>
<DialogTitle>Share Profile</DialogTitle>
<DialogDescription>
Share {displayName}&apos;s profile with others
            </DialogDescription>
</DialogHeader>
<div className='flex items-center space-x-2'>
<div className='grid flex-1 gap-2'>
<label htmlFor='profile-link' className='sr-only'>
Profile Link
              </label>
<input
id='profile-link'
readOnly
value={profileUrl}
className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
aria-label='Profile URL'
              />
</div>
<Button
type='button'
size='sm'
className='px-3'
onClick={handleCopyLink}
aria-label={copied ? 'Link copied' : 'Copy profile link'}
            >
<span className='sr-only'>Copy</span>
{copied ? (
<Check className='h-4 w-4 text-success' aria-hidden='true' />
              ) : (
<Copy className='h-4 w-4' aria-hidden='true' />
              )}
</Button>
</div>
<DialogFooter className='sm:justify-start'>
<Button
type='button'
variant='secondary'
onClick={() => setIsShareDialogOpen(false)}
            >
Close
            </Button>
</DialogFooter>
</DialogContent>
</Dialog>
</>
  )
})
