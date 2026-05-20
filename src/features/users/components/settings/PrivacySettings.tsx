'use client'

import { useState, memo } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { UserSettings } from '@/types/settings'
import {
  Shield,
  Eye,
  History,
  Trophy,
  Users,
  BarChart3,
  Activity,
  Check,
  Globe,
  Lock,
  UserCheck
} from 'lucide-react'

interface PrivacySettingsProps {
  settings: UserSettings
  onUpdate: (settings: Partial<UserSettings>) => void
}

interface PrivacyItemProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const PrivacyItem = memo(function PrivacyItem({
  icon,
  title,
  description,
  checked,
  onCheckedChange
}: PrivacyItemProps) {
  return (
    <div className='flex items-center justify-between py-4 border-b border-border/40 last:border-0'>
      <div className='flex items-start gap-3'>
        <div className='p-2 rounded-lg bg-primary/10 text-primary'>{icon}</div>
        <div>
          <Label className='text-base font-medium'>{title}</Label>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Toggle ${title}`}
      />
    </div>
  )
})

export const PrivacySettings = memo(function PrivacySettings({
  settings,
  onUpdate
}: PrivacySettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [privacy, setPrivacy] = useState(settings.privacy)

  const updatePrivacy = (
    key: keyof typeof privacy,
    value: boolean | string
  ) => {
    const updated = { ...privacy, [key]: value }
    setPrivacy(updated as typeof privacy)
    onUpdate({ privacy: updated as typeof privacy })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const getVisibilityIcon = () => {
    switch (privacy.profileVisibility) {
      case 'public':
        return <Globe className='w-4 h-4' />
      case 'friends':
        return <UserCheck className='w-4 h-4' />
      case 'private':
        return <Lock className='w-4 h-4' />
      default:
        return <Globe className='w-4 h-4' />
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>Privacy Settings</h3>
        <p className='text-sm text-muted-foreground'>
          Control who can see your profile and activity
        </p>
      </div>

      {saveSuccess && (
        <div className='flex items-center gap-2 text-green-500 text-sm p-3 bg-green-500/10 rounded-lg'>
          <Check className='w-4 h-4' aria-hidden='true' />
          Privacy settings saved!
        </div>
      )}

      {/* Profile Visibility */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='w-5 h-5 text-primary' aria-hidden='true' />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Choose who can see your profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div className='flex items-start gap-3'>
              <div className='p-2 rounded-lg bg-primary/10 text-primary'>
                {getVisibilityIcon()}
              </div>
              <div>
                <Label className='text-base font-medium'>
                  Who can see your profile?
                </Label>
                <p className='text-sm text-muted-foreground'>
                  Control the visibility of your profile page
                </p>
              </div>
            </div>
            <Select
              value={privacy.profileVisibility}
              onValueChange={(value: 'public' | 'friends' | 'private') =>
                updatePrivacy('profileVisibility', value)
              }
            >
              <SelectTrigger className='w-40'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='bg-background'>
                <SelectItem value='public'>
                  <div className='flex items-center gap-2'>
                    <Globe className='w-4 h-4' aria-hidden='true' />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value='friends'>
                  <div className='flex items-center gap-2'>
                    <UserCheck className='w-4 h-4' aria-hidden='true' />
                    Friends Only
                  </div>
                </SelectItem>
                <SelectItem value='private'>
                  <div className='flex items-center gap-2'>
                    <Lock className='w-4 h-4' aria-hidden='true' />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Privacy */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='w-5 h-5 text-primary' aria-hidden='true' />
            Activity Privacy
          </CardTitle>
          <CardDescription>
            Manage what others can see about your activity
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0'>
          <PrivacyItem
            icon={<Eye className='w-4 h-4' aria-hidden='true' />}
            title='Show Online Status'
            description='Let others see when you are online'
            checked={privacy.showOnlineStatus}
            onCheckedChange={(checked) =>
              updatePrivacy('showOnlineStatus', checked)
            }
          />
          <PrivacyItem
            icon={<History className='w-4 h-4' aria-hidden='true' />}
            title='Show Quiz History'
            description='Allow others to view your quiz history'
            checked={privacy.showQuizHistory}
            onCheckedChange={(checked) =>
              updatePrivacy('showQuizHistory', checked)
            }
          />
          <PrivacyItem
            icon={<Trophy className='w-4 h-4' aria-hidden='true' />}
            title='Show Achievements'
            description='Display your achievements on your profile'
            checked={privacy.showAchievements}
            onCheckedChange={(checked) =>
              updatePrivacy('showAchievements', checked)
            }
          />
          <PrivacyItem
            icon={<Activity className='w-4 h-4' aria-hidden='true' />}
            title='Share Activity with Friends'
            description='Let friends see your recent quiz activities'
            checked={privacy.shareActivityWithFriends}
            onCheckedChange={(checked) =>
              updatePrivacy('shareActivityWithFriends', checked)
            }
          />
        </CardContent>
      </Card>

      {/* Social Privacy */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='w-5 h-5 text-primary' aria-hidden='true' />
            Social Privacy
          </CardTitle>
          <CardDescription>
            Control social interactions and leaderboard visibility
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0'>
          <PrivacyItem
            icon={<Users className='w-4 h-4' aria-hidden='true' />}
            title='Allow Friend Requests'
            description='Let others send you friend requests'
            checked={privacy.allowFriendRequests}
            onCheckedChange={(checked) =>
              updatePrivacy('allowFriendRequests', checked)
            }
          />
          <PrivacyItem
            icon={<BarChart3 className='w-4 h-4' aria-hidden='true' />}
            title='Show in Leaderboard'
            description='Appear in public leaderboards and rankings'
            checked={privacy.showInLeaderboard}
            onCheckedChange={(checked) =>
              updatePrivacy('showInLeaderboard', checked)
            }
          />
        </CardContent>
      </Card>
    </div>
  )
})
