'use client'

import { useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  UserSettings,
  languages,
  timezones,
  dateFormats
} from '@/types/settings'
import { Globe, Clock, Calendar, Check } from 'lucide-react'

interface LanguageSettingsProps {
  settings: UserSettings
  onUpdate: (settings: Partial<UserSettings>) => void
}

export function LanguageSettings({
  settings,
  onUpdate
}: LanguageSettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [locale, setLocale] = useState(settings.locale)

  const updateLocale = (key: keyof typeof locale, value: string) => {
    const updated = { ...locale, [key]: value }
    setLocale(updated as typeof locale)
    onUpdate({ locale: updated as typeof locale })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>Language & Region</h3>
        <p className='text-sm text-muted-foreground'>
          Customize your language and regional preferences
        </p>
      </div>

      {saveSuccess && (
        <div className='flex items-center gap-2 text-green-500 text-sm p-3 bg-green-500/10 rounded-lg'>
          <Check className='w-4 h-4' />
          Language preferences saved!
        </div>
      )}

      {/* Language Selection */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Globe className='w-5 h-5 text-primary' />
            Language
          </CardTitle>
          <CardDescription>
            Select your preferred language for the interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Display Language</Label>
              <Select
                value={locale.language}
                onValueChange={(value) => updateLocale('language', value)}
              >
                <SelectTrigger className='w-full md:w-80'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-background'>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                This will change the language of all text in the app
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Selection */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='w-5 h-5 text-primary' />
            Time Zone
          </CardTitle>
          <CardDescription>
            Set your timezone for accurate scheduling and timestamps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Your Timezone</Label>
              <Select
                value={locale.timezone}
                onValueChange={(value) => updateLocale('timezone', value)}
              >
                <SelectTrigger className='w-full md:w-96'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-background max-h-60'>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time Format */}
      <Card className='border-border/40 py-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Calendar className='w-5 h-5 text-primary' />
            Date & Time Format
          </CardTitle>
          <CardDescription>
            Customize how dates and times are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Date Format */}
          <div className='space-y-3'>
            <Label>Date Format</Label>
            <Select
              value={locale.dateFormat}
              onValueChange={(value) => updateLocale('dateFormat', value)}
            >
              <SelectTrigger className='w-full md:w-60'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='bg-background'>
                {dateFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Format */}
          <div className='space-y-3'>
            <Label>Time Format</Label>
            <RadioGroup
              value={locale.timeFormat}
              onValueChange={(value: '12h' | '24h') =>
                updateLocale('timeFormat', value)
              }
              className='flex gap-4'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='12h' id='12h' />
                <Label htmlFor='12h' className='cursor-pointer'>
                  12-hour (1:30 PM)
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='24h' id='24h' />
                <Label htmlFor='24h' className='cursor-pointer'>
                  24-hour (13:30)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          <div className='p-4 rounded-lg bg-muted/30 border border-border/40 py-4'>
            <Label className='text-sm text-muted-foreground'>Preview</Label>
            <div className='mt-2 space-y-1'>
              <p className='text-sm'>
                <span className='text-muted-foreground'>Date: </span>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </p>
              <p className='text-sm'>
                <span className='text-muted-foreground'>Time: </span>
                {new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: locale.timeFormat === '12h'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
