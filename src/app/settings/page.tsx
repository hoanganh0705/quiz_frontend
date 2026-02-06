'use client'

import { useState, useMemo, useCallback, memo } from 'react'
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
import { User, Bell, Shield, Globe, Link2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsTabs: {
  id: SettingsTab
  label: string
  icon: React.ReactNode
}[] = [
  {
    id: 'account',
    label: 'Account',
    icon: <User className='w-5 h-5' aria-hidden='true' />
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className='w-5 h-5' aria-hidden='true' />
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: <Shield className='w-5 h-5' aria-hidden='true' />
  },
  {
    id: 'language',
    label: 'Language & Region',
    icon: <Globe className='w-5 h-5' aria-hidden='true' />
  },
  {
    id: 'connections',
    label: 'Connected Accounts',
    icon: <Link2 className='w-5 h-5' aria-hidden='true' />
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <AlertTriangle className='w-5 h-5' aria-hidden='true' />
  }
]

const SettingsPage = memo(function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    'user_settings',
    defaultSettings
  )

  const handleUpdateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates
    }))
  }, [])

  const handleDeleteAccount = useCallback(() => {
    // In a real app, this would call an API to delete the account
    alert('Account deletion would be processed here')
  }, [])

  const handleExportData = useCallback(() => {
    // Export settings as JSON file
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quiz-app-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [settings])

  const handleSignOutAll = useCallback(() => {
    // In a real app, this would call an API to invalidate all sessions
    alert('All sessions would be signed out here')
  }, [])

  const renderContent = useMemo(() => {
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
  }, [
    activeTab,
    settings,
    handleUpdateSettings,
    handleDeleteAccount,
    handleExportData,
    handleSignOutAll
  ])

  return (
    <main className='min-h-screen bg-transparent text-foreground mt-20'>
      {/* Header */}
      <header className='text-center px-4 mb-8'>
        <h1 className='text-3xl font-bold mb-4'>Settings</h1>
        <p className='text-foreground/70 text-base max-w-2xl mx-auto'>
          Manage your account settings and preferences
        </p>
      </header>

      {/* Main Content */}
      <div className='px-4 pb-12'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Sidebar Navigation */}
          <div className='lg:col-span-1'>
            <div className='bg-transparent border border-gray-300 dark:border-slate-700 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-6'>Settings</h3>
              <nav className='space-y-2' aria-label='Settings navigation'>
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer',
                      activeTab === tab.id
                        ? 'bg-default text-white'
                        : 'text-foreground hover:bg-default-hover hover:text-white',
                      tab.id === 'danger' &&
                        activeTab !== tab.id &&
                        'text-destructive hover:text-white'
                    )}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    aria-label={`${tab.label} settings`}
                  >
                    {tab.icon}
                    <span className='text-sm'>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className='lg:col-span-3'>
            <ScrollArea className='h-full'>
              <div className='p-1'>{renderContent}</div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </main>
  )
})

export default SettingsPage
