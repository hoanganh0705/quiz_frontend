import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Edit,
  MapPin,
  Calendar,
  BadgeCheck,
  Star,
  Award,
  Share2,
  Camera,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { Player } from '@/constants/players'

interface ProfileHeaderProps {
  user: Player
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <div className='border border-border bg-main rounded-2xl mt-6 overflow-hidden'>
      {/* Cover Image */}
      <div className='relative h-32 bg-linear-to-r from-default/30 via-default/20 to-default/10'>
        <Button
          size='sm'
          variant='secondary'
          className='absolute bottom-3 right-3 gap-2 text-xs'
        >
          <Camera className='w-3 h-3' />
          Change Cover
        </Button>
      </div>

      {/* Profile Info */}
      <div className='px-8 pb-6'>
        <div className='flex flex-col md:flex-row items-start justify-between gap-6'>
          {/* Avatar & Info */}
          <div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
            <div className='relative -mt-12'>
              <Avatar className='h-24 w-24 border-4 border-main'>
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className='text-2xl'>
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <Button
                size='icon'
                variant='secondary'
                className='absolute bottom-0 right-0 h-7 w-7 rounded-full'
              >
                <Camera className='w-3 h-3' />
              </Button>
            </div>

            <div className='flex-1 pt-2'>
              <div className='flex flex-wrap items-center gap-3 mb-2'>
                <h1 className='text-2xl font-bold text-foreground'>
                  {user.name}
                </h1>
                <Badge className='bg-default/20 text-default border-default/30 gap-1'>
                  <BadgeCheck className='w-3 h-3' />
                  Verified
                </Badge>
                <Badge
                  variant='outline'
                  className='border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1'
                >
                  <Star className='w-3 h-3 fill-current' />
                  {user.levelString || `Level ${user.level}`}
                </Badge>
                {user.badge && (
                  <Badge
                    variant='outline'
                    className='border-purple-500/30 bg-purple-500/10 text-purple-500 gap-1'
                  >
                    <Award className='w-3 h-3' />
                    {user.badge}
                  </Badge>
                )}
              </div>

              <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
                <span>@{user.name.toLowerCase().replace(' ', '')}</span>
                <span className='flex items-center gap-1'>
                  <MapPin className='w-3 h-3' />
                  {user.country}
                </span>
                <span className='flex items-center gap-1'>
                  <Calendar className='w-3 h-3' />
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
                  <span className='text-muted-foreground ml-2'>
                    Quizzes Taken
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-bold'>
                    {user.quizzesCreated}
                  </span>
                  <span className='text-muted-foreground ml-2'>
                    Quizzes Created
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-bold'>
                    {user.followers}
                  </span>
                  <span className='text-muted-foreground ml-2'>Followers</span>
                </div>
                <div>
                  <span className='text-foreground font-bold'>
                    {user.following}
                  </span>
                  <span className='text-muted-foreground ml-2'>Following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 self-start mt-4 md:mt-0'>
            <Button className='gap-2' asChild>
              <Link href='/settings'>
                <Edit className='w-4 h-4' />
                Edit Profile
              </Link>
            </Button>
            <Button variant='outline' className='gap-2 text-primary'>
              <Share2 className='w-4 h-4' />
              Share
            </Button>
            <Button size='icon' asChild>
              <Link href='/settings'>
                <Settings className='w-4 h-4' />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
