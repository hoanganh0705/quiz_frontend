'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { UserSettings } from '@/types/settings'
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Users,
  Trophy,
  Megaphone,
  Check,
  Sparkles
} from 'lucide-react'

interface NotificationSettingsProps {
  settings: UserSettings
  onUpdate: (settings: Partial<UserSettings>) => void
}

interface NotificationItemProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function NotificationItem({
  icon,
  title,
  description,
  checked,
  onCheckedChange
}: NotificationItemProps) {
  return (
    <div className='flex items-center justify-between py-4 border-b border-border/40 last:border-0'>
      <div className='flex items-start gap-3'>
        <div className='p-2 rounded-lg bg-primary/10 text-primary'>{icon}</div>
        <div>
          <Label className='text-base font-medium'>{title}</Label>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function NotificationSettings({
  settings,
  onUpdate
}: NotificationSettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [notifications, setNotifications] = useState(settings.notifications)

  const updateNotification = (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    onUpdate({ notifications: updated })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const enableAll = () => {
    const allEnabled = Object.keys(notifications).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    ) as typeof notifications
    setNotifications(allEnabled)
    onUpdate({ notifications: allEnabled })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const disableAll = () => {
    const allDisabled = Object.keys(notifications).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {}
    ) as typeof notifications
    setNotifications(allDisabled)
    onUpdate({ notifications: allDisabled })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  return (
    <div className='space-y-6'>
      {/* Quick Actions */}
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Notification Preferences</h3>
          <p className='text-sm text-muted-foreground'>
            Choose what notifications you want to receive
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={enableAll}>
            Enable All
          </Button>
          <Button variant='outline' size='sm' onClick={disableAll}>
            Disable All
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className='flex items-center gap-2 text-green-500 text-sm p-3 bg-green-500/10 rounded-lg'>
          <Check className='w-4 h-4' />
          Notification preferences saved!
        </div>
      )}

      {/* Email & Push Notifications */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bell className='w-5 h-5 text-primary' />
            General Notifications
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0'>
          <NotificationItem
            icon={<Mail className='w-4 h-4' />}
            title='Email Notifications'
            description='Receive notifications via email'
            checked={notifications.emailNotifications}
            onCheckedChange={(checked) =>
              updateNotification('emailNotifications', checked)
            }
          />
          <NotificationItem
            icon={<Smartphone className='w-4 h-4' />}
            title='Push Notifications'
            description='Receive push notifications on your devices'
            checked={notifications.pushNotifications}
            onCheckedChange={(checked) =>
              updateNotification('pushNotifications', checked)
            }
          />
        </CardContent>
      </Card>

      {/* Activity Notifications */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-primary' />
            Activity Notifications
          </CardTitle>
          <CardDescription>
            Stay updated on quiz activities and social interactions
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0'>
          <NotificationItem
            icon={<Clock className='w-4 h-4' />}
            title='Quiz Reminders'
            description='Get reminded about scheduled quizzes and daily challenges'
            checked={notifications.quizReminders}
            onCheckedChange={(checked) =>
              updateNotification('quizReminders', checked)
            }
          />
          <NotificationItem
            icon={<Users className='w-4 h-4' />}
            title='Friend Requests'
            description='Notify when someone sends you a friend request'
            checked={notifications.friendRequests}
            onCheckedChange={(checked) =>
              updateNotification('friendRequests', checked)
            }
          />
          <NotificationItem
            icon={<Trophy className='w-4 h-4' />}
            title='Challenge Invites'
            description='Get notified when friends challenge you to a quiz'
            checked={notifications.challengeInvites}
            onCheckedChange={(checked) =>
              updateNotification('challengeInvites', checked)
            }
          />
          <NotificationItem
            icon={<Sparkles className='w-4 h-4' />}
            title='Achievement Alerts'
            description='Celebrate when you unlock new achievements'
            checked={notifications.achievementAlerts}
            onCheckedChange={(checked) =>
              updateNotification('achievementAlerts', checked)
            }
          />
        </CardContent>
      </Card>

      {/* Marketing & Updates */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Megaphone className='w-5 h-5 text-primary' />
            Updates & Marketing
          </CardTitle>
          <CardDescription>
            Stay informed about new features and promotions
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-0'>
          <NotificationItem
            icon={<Mail className='w-4 h-4' />}
            title='Weekly Digest'
            description='Receive a weekly summary of your quiz activities'
            checked={notifications.weeklyDigest}
            onCheckedChange={(checked) =>
              updateNotification('weeklyDigest', checked)
            }
          />
          <NotificationItem
            icon={<Megaphone className='w-4 h-4' />}
            title='Marketing Emails'
            description='Receive promotional offers and new feature announcements'
            checked={notifications.marketingEmails}
            onCheckedChange={(checked) =>
              updateNotification('marketingEmails', checked)
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
