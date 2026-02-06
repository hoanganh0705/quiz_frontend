'use client'

import { useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserSettings } from '@/types/settings'
import {
  User,
  Mail,
  AtSign,
  Camera,
  Lock,
  Check,
  Eye,
  EyeOff
} from 'lucide-react'

interface AccountSettingsProps {
  settings: UserSettings
  onUpdate: (settings: Partial<UserSettings>) => void
}

export const AccountSettings = memo(function AccountSettings({
  settings,
  onUpdate
}: AccountSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [formData, setFormData] = useState({
    displayName: settings.account.displayName,
    username: settings.account.username,
    email: settings.account.email
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = () => {
    onUpdate({
      account: {
        ...settings.account,
        ...formData
      }
    })
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handlePasswordChange = () => {
    // In a real app, this would call an API
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters!')
      return
    }
    // Simulate password change
    setShowPasswordDialog(false)
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleCancel = () => {
    setFormData({
      displayName: settings.account.displayName,
      username: settings.account.username,
      email: settings.account.email
    })
    setIsEditing(false)
  }

  return (
    <div className='space-y-6'>
      {/* Profile Picture Section */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Camera className='w-5 h-5 text-primary' aria-hidden='true' />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Your profile picture is visible to other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-6'>
            <Avatar className='w-24 h-24 border-4 border-primary/20'>
              <AvatarImage
                src={settings.account.avatarUrl}
                alt={`${settings.account.displayName}'s profile picture`}
                loading='lazy'
              />
              <AvatarFallback className='text-2xl bg-primary/20'>
                {settings.account.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className='space-y-2'>
              <Button
                variant='outline'
                size='sm'
                aria-label='Upload new profile photo'
              >
                <Camera className='w-4 h-4 mr-2' aria-hidden='true' />
                Upload New Photo
              </Button>
              <p className='text-xs text-muted-foreground'>
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information Section */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <User className='w-5 h-5 text-primary' aria-hidden='true' />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='displayName' className='flex items-center gap-2'>
                <User className='w-4 h-4' aria-hidden='true' />
                Display Name
              </Label>
              <Input
                id='displayName'
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                disabled={!isEditing}
                className='bg-background/50'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='username' className='flex items-center gap-2'>
                <AtSign className='w-4 h-4' aria-hidden='true' />
                Username
              </Label>
              <Input
                id='username'
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={!isEditing}
                className='bg-background/50'
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email' className='flex items-center gap-2'>
              <Mail className='w-4 h-4' aria-hidden='true' />
              Email Address
            </Label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={!isEditing}
              className='bg-background/50'
            />
          </div>

          {isEditing && (
            <div className='flex gap-2 pt-2'>
              <Button
                onClick={handleSave}
                className='gap-2'
                aria-label='Save account changes'
              >
                <Check className='w-4 h-4' aria-hidden='true' />
                Save Changes
              </Button>
              <Button variant='outline' onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}

          {saveSuccess && (
            <div className='flex items-center gap-2 text-green-500 text-sm'>
              <Check className='w-4 h-4' aria-hidden='true' />
              Changes saved successfully!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Lock className='w-5 h-5 text-primary' aria-hidden='true' />
            Password & Security
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
          >
            <DialogTrigger asChild>
              <Button variant='outline' aria-label='Change account password'>
                <Lock className='w-4 h-4 mr-2' aria-hidden='true' />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and a new password to update your
                  credentials.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='currentPassword'>Current Password</Label>
                  <div className='relative'>
                    <Input
                      id='currentPassword'
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value
                        })
                      }
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          current: !showPassword.current
                        })
                      }
                      aria-label={
                        showPassword.current
                          ? 'Hide current password'
                          : 'Show current password'
                      }
                    >
                      {showPassword.current ? (
                        <EyeOff className='w-4 h-4' aria-hidden='true' />
                      ) : (
                        <Eye className='w-4 h-4' aria-hidden='true' />
                      )}
                    </Button>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='newPassword'>New Password</Label>
                  <div className='relative'>
                    <Input
                      id='newPassword'
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })
                      }
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          new: !showPassword.new
                        })
                      }
                      aria-label={
                        showPassword.new
                          ? 'Hide new password'
                          : 'Show new password'
                      }
                    >
                      {showPassword.new ? (
                        <EyeOff className='w-4 h-4' aria-hidden='true' />
                      ) : (
                        <Eye className='w-4 h-4' aria-hidden='true' />
                      )}
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Must be at least 8 characters
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword'>Confirm New Password</Label>
                  <div className='relative'>
                    <Input
                      id='confirmPassword'
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })
                      }
                      className='pr-10'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() =>
                        setShowPassword({
                          ...showPassword,
                          confirm: !showPassword.confirm
                        })
                      }
                      aria-label={
                        showPassword.confirm
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      {showPassword.confirm ? (
                        <EyeOff className='w-4 h-4' aria-hidden='true' />
                      ) : (
                        <Eye className='w-4 h-4' aria-hidden='true' />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handlePasswordChange}>Update Password</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
})
