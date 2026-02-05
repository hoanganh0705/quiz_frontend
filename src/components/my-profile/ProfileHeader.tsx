'use client'

import { useRef, useState, useCallback, memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Avatar } from '@/components/ui/avatar'
import { AvatarImage } from '@/components/ui/avatar'
import { AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { DialogContent } from '@/components/ui/dialog'
import { DialogDescription } from '@/components/ui/dialog'
import { DialogFooter } from '@/components/ui/dialog'
import { DialogHeader } from '@/components/ui/dialog'
import { DialogTitle } from '@/components/ui/dialog'
import {
  Edit,
  MapPin,
  Calendar,
  Share2,
  Camera,
  Settings,
  Check,
  Copy,
  X,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Player } from '@/constants/players'
import { useClipboard } from '@/hooks'

// Hoist constants outside component (data-hoisting)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

interface ProfileHeaderProps {
  user: Player
  onAvatarChange?: (file: File) => Promise<void>
  onCoverChange?: (file: File) => Promise<void>
}

export const ProfileHeader = memo(function ProfileHeader({
  user,
  onAvatarChange,
  onCoverChange
}: ProfileHeaderProps) {
  // Refs for file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // State for image previews
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Loading states
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [isCoverUploading, setIsCoverUploading] = useState(false)

  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Error state
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Clipboard hook
  const { copied, copy } = useClipboard(2000)

  // Get profile URL
  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${user.id}`
      : `/profile/${user.id}`

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }, [])

  // Handle avatar file selection
  const handleAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const error = validateFile(file)
      if (error) {
        setUploadError(error)
        return
      }

      setUploadError(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Call upload handler if provided
      if (onAvatarChange) {
        setIsAvatarUploading(true)
        try {
          await onAvatarChange(file)
        } catch {
          setUploadError('Failed to upload avatar. Please try again.')
          setAvatarPreview(null)
        } finally {
          setIsAvatarUploading(false)
        }
      }

      // Reset input
      event.target.value = ''
    },
    [onAvatarChange, validateFile]
  )

  // Handle cover file selection
  const handleCoverChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const error = validateFile(file)
      if (error) {
        setUploadError(error)
        return
      }

      setUploadError(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Call upload handler if provided
      if (onCoverChange) {
        setIsCoverUploading(true)
        try {
          await onCoverChange(file)
        } catch {
          setUploadError('Failed to upload cover image. Please try again.')
          setCoverPreview(null)
        } finally {
          setIsCoverUploading(false)
        }
      }

      // Reset input
      event.target.value = ''
    },
    [onCoverChange, validateFile]
  )

  // Handle share functionality
  const handleShare = useCallback(async () => {
    // Try native share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name}'s Profile`,
          text: `Check out ${user.name}'s profile on Quiz App!`,
          url: profileUrl
        })
        return
      } catch (error) {
        // User cancelled or share failed, fall back to dialog
        if ((error as Error).name === 'AbortError') return
      }
    }

    // Fall back to share dialog
    setIsShareDialogOpen(true)
  }, [user.name, profileUrl])

  // Copy profile link
  const handleCopyLink = useCallback(() => {
    copy(profileUrl)
  }, [copy, profileUrl])

  // Dismiss error
  const dismissError = useCallback(() => {
    setUploadError(null)
  }, [])

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type='file'
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleAvatarChange}
        className='hidden'
        aria-label='Upload avatar image'
      />
      <input
        ref={coverInputRef}
        type='file'
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleCoverChange}
        className='hidden'
        aria-label='Upload cover image'
      />

      {/* Error notification */}
      {uploadError && (
        <div className='fixed top-4 right-4 z-50 flex items-center gap-3 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2'>
          <span className='text-sm'>{uploadError}</span>
          <button
            onClick={dismissError}
            className='p-1 hover:bg-destructive-foreground/10 rounded'
            aria-label='Dismiss error'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      <div className='border border-border rounded-2xl mt-6 overflow-hidden'>
        {/* Cover Image */}
        <section
          aria-label='Cover image'
          className='relative h-32 bg-linear-to-r from-default/30 via-default/20 to-default/10'
        >
          {(coverPreview || user.bgImageUrl) && (
            <Image
              src={coverPreview || user.bgImageUrl || ''}
              alt='Profile cover'
              fill
              className='object-cover'
              priority
            />
          )}
          {isCoverUploading && (
            <div
              className='absolute inset-0 bg-background/50 flex items-center justify-center'
              role='status'
              aria-label='Uploading cover image'
            >
              <Loader2
                className='w-6 h-6 animate-spin text-primary'
                aria-hidden='true'
              />
            </div>
          )}
          <Button
            size='sm'
            variant='secondary'
            className='absolute bottom-3 right-3 gap-2 text-xs'
            onClick={() => coverInputRef.current?.click()}
            disabled={isCoverUploading}
            aria-label='Change cover image'
          >
            <Camera className='w-3 h-3' aria-hidden='true' />
            Change Cover
          </Button>
        </section>

        {/* Profile Info */}
        <div className='px-8 pb-6'>
          <div className='flex flex-col md:flex-row items-start justify-between gap-6'>
            {/* Avatar & Info */}
            <div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
              <div className='relative -mt-12'>
                <Avatar className='h-24 w-24 border-4 border-main'>
                  <AvatarImage
                    src={avatarPreview || user.avatarUrl}
                    alt={`${user.name}'s avatar`}
                  />
                  <AvatarFallback className='text-2xl'>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                {isAvatarUploading && (
                  <div
                    className='absolute inset-0 bg-background/50 flex items-center justify-center rounded-full'
                    role='status'
                    aria-label='Uploading avatar'
                  >
                    <Loader2
                      className='w-6 h-6 animate-spin text-primary'
                      aria-hidden='true'
                    />
                  </div>
                )}
                <Button
                  size='icon'
                  variant='secondary'
                  className='absolute bottom-0 right-0 h-7 w-7 rounded-full'
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isAvatarUploading}
                  aria-label='Change avatar'
                >
                  <Camera className='w-3 h-3' aria-hidden='true' />
                </Button>
              </div>

              <div className='flex-1 pt-2'>
                <div className='flex flex-wrap items-center gap-3 mb-2'>
                  <h1 className='text-2xl font-bold text-foreground'>
                    {user.name}
                  </h1>
                </div>

                <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
                  <span>@{user.name.toLowerCase().replace(' ', '')}</span>
                  <span className='flex items-center gap-1'>
                    <MapPin className='w-3 h-3' aria-hidden='true' />
                    {user.country}
                  </span>
                  <span className='flex items-center gap-1'>
                    <Calendar className='w-3 h-3' aria-hidden='true' />
                    Joined March 15, 2022
                  </span>
                </div>

                <p className='text-muted-foreground mb-4 text-sm max-w-xl'>
                  {user.bio}
                </p>

                {/* Quick Stats */}
                <div className='flex flex-wrap gap-6 text-sm'>
                  <div>
                    <span className='text-foreground font-bold'>
                      {user.quizzes}
                    </span>
                    <span className='text-muted-foreground ml-1'>
                      Quizzes Taken
                    </span>
                  </div>
                  <div>
                    <span className='text-foreground font-bold'>
                      {user.quizzesCreated}
                    </span>
                    <span className='text-muted-foreground ml-1'>
                      Quizzes Created
                    </span>
                  </div>
                  <div>
                    <span className='text-foreground font-bold'>
                      {user.followers}
                    </span>
                    <span className='text-muted-foreground ml-1'>
                      Followers
                    </span>
                  </div>
                  <div>
                    <span className='text-foreground font-bold'>
                      {user.following}
                    </span>
                    <span className='text-muted-foreground ml-1'>
                      Following
                    </span>
                  </div>
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
              Share {user.name}&apos;s profile with others
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
                <Check className='h-4 w-4 text-green-500' aria-hidden='true' />
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
