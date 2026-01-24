'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AccountSettings,
  NotificationSettings,
  PrivacySettings,
  LanguageSettings,
  ConnectedAccounts,
  DangerZone
} from '@/components/settings'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { UserSettings, SettingsTab, defaultSettings } from '@/types/settings'
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Globe,
  Link2,
  AlertTriangle,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const settingsTabs: {
  id: SettingsTab
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'account', label: 'Account', icon: <User className='w-4 h-4' /> },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className='w-4 h-4' />
  },
  { id: 'privacy', label: 'Privacy', icon: <Shield className='w-4 h-4' /> },
  {
    id: 'language',
    label: 'Language & Region',
    icon: <Globe className='w-4 h-4' />
  },
  {
    id: 'connections',
    label: 'Connected Accounts',
    icon: <Link2 className='w-4 h-4' />
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <AlertTriangle className='w-4 h-4' />
  }
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    'user_settings',
    defaultSettings
  )

  const handleUpdateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates
    }))
  }

  const handleDeleteAccount = () => {
    // In a real app, this would call an API to delete the account
    alert('Account deletion would be processed here')
  }

  const handleExportData = () => {
    // Export settings as JSON file
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quiz-app-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSignOutAll = () => {
    // In a real app, this would call an API to invalidate all sessions
    alert('All sessions would be signed out here')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <AccountSettings
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )
      case 'notifications':
        return (
          <NotificationSettings
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )
      case 'privacy':
        return (
          <PrivacySettings
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )
      case 'language':
        return (
          <LanguageSettings
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )
      case 'connections':
        return (
          <ConnectedAccounts
            settings={settings}
            onUpdate={handleUpdateSettings}
          />
        )
      case 'danger':
        return (
          <DangerZone
            onDeleteAccount={handleDeleteAccount}
            onExportData={handleExportData}
            onSignOutAll={handleSignOutAll}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className='min-h-screen flex items-start justify-center pt-10 pb-20'>
      <div className='w-[90%] max-w-6xl'>
        {/* Header */}
        <div className='mb-8'>
          <Button
            size='sm'
            className='text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground shadow-none mb-4'
            asChild
          >
            <Link href='/'>
              <ArrowLeft className='w-5 h-5 mr-2' />
              Back to Home
            </Link>
          </Button>

          <div className='flex items-center gap-3'>
            <div className='p-3 rounded-xl bg-primary/10'>
              <Settings className='w-8 h-8 text-primary' />
            </div>
            <div>
              <h1 className='text-3xl font-bold'>Settings</h1>
              <p className='text-muted-foreground'>
                Manage your account settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Layout */}
        <div className='flex flex-col md:flex-row gap-6'>
          {/* Sidebar Navigation */}
          <nav className='w-full md:w-64 shrink-0'>
            <div className='sticky top-24 space-y-1 p-2 rounded-xl border border-border/40 bg-card/30'>
              {settingsTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant='ghost'
                  className={cn(
                    'w-full justify-start gap-3 h-11',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'hover:bg-muted/50',
                    tab.id === 'danger' &&
                      'text-destructive hover:text-destructive'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <div className='flex-1 min-w-0'>
            <ScrollArea className='h-full'>
              <div className='p-1'>{renderContent()}</div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
