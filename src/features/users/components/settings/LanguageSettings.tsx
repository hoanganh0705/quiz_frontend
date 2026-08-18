'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/Select';
import * as SelectPrimitive from '@radix-ui/react-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { useToast } from '@/lib/forms/useToast';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { useUpdateMySettings } from '@/features/users/hooks/useUpdateMySettings';
import { useAppLanguage } from '@/shared/hooks/use-app-language';
import { languages, timezones, dateFormats } from '@/features/users/constants/settings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import { Globe, Clock, Calendar, Check, Loader2 } from 'lucide-react';

export interface LanguageSettingsProps {
profile: UserMeResponseDto | null;
}

interface LocaleData {
language: string;
timezone: string;
dateFormat: string;
timeFormat: string;
}

export const LanguageSettings = memo(function LanguageSettings({
profile,
}: LanguageSettingsProps) {
const updateSettings = useUpdateMySettings({});
const toast = useToast();
const { setLanguage } = useAppLanguage();

const defaultLocale = useMemo<LocaleData>(() => {
const stored = (
profile?.settings as Record<string, unknown> | undefined
    )?.locale as Record<string, unknown> | undefined;
return {
language: (stored?.language as string) ?? 'en',
timezone: (stored?.timezone as string) ?? 'UTC',
dateFormat: (stored?.dateFormat as string) ?? 'MM/DD/YYYY',
timeFormat: (stored?.timeFormat as string) ?? '12h',
    };
  }, [profile]);

const [localLocale, setLocalLocale] = useState(defaultLocale);

useEffect(() => {
setLocalLocale(defaultLocale);
  }, [defaultLocale]);

useEffect(() => {
if (updateSettings.isSuccess) {
toast.push({
title: 'Language preferences saved',
body: 'Your changes have been saved.',
durationMs: 3000,
      });
updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

const handleLocaleChange = useCallback(
(key: keyof LocaleData, value: string) => {
const updated: LocaleData = { ...localLocale, [key]: value };
setLocalLocale(updated);

if (key === 'language') {
setLanguage(value);
      }

updateSettings.mutate(
{ preferences: updated as unknown as Record<string, unknown> } as Parameters<typeof updateSettings.mutate>[0],
      );
    },
[localLocale, setLanguage, updateSettings],
  );

const isSaving = updateSettings.isPending;

if (!profile) {
return (
<div className="space-y-6">
<div className="h-16 animate-pulse rounded-lg bg-muted" />
<div className="h-48 animate-pulse rounded-lg bg-muted" />
</div>
    );
  }

return (
<div className="space-y-6">
{/* Error banner */}
{updateSettings.lastError && (
<FormErrorBanner
lastError={{
...updateSettings.lastError,
code: updateSettings.lastApiError?.code ?? 'GLOBAL_UNKNOWN',
          }}
onDismiss={updateSettings.resetError}
        />
      )}

{/* Header */}
<div>
<h3 className="text-lg font-semibold">Language &amp; Region</h3>
<p className="text-sm text-muted-foreground">
Customize your language and regional preferences.
        </p>
</div>

{/* Language */}
<Card className="border-border/40 py-4">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Globe className="w-5 h-5 text-primary" aria-hidden="true" />
Language
          </CardTitle>
<CardDescription>
Select your preferred language for the interface.
          </CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="space-y-2">
<Label htmlFor="language-select">Display Language</Label>
<SelectPrimitive.Root
value={localLocale.language}
onValueChange={(v) => handleLocaleChange('language', v)}
              >
<SelectTrigger className="w-full md:w-80" disabled={isSaving}>
<SelectValue />
</SelectTrigger>
<SelectContent className="bg-background">
{languages.map((lang) => (
<SelectItem key={lang.value} value={lang.value}>
{lang.label}
</SelectItem>
                  ))}
</SelectContent>
</SelectPrimitive.Root>
<p className="text-xs text-muted-foreground">
This will change the language of all text in the app.
              </p>
</div>
</div>
</CardContent>
</Card>

{/* Timezone */}
<Card className="border-border/40 py-4">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Clock className="w-5 h-5 text-primary" aria-hidden="true" />
Time Zone
          </CardTitle>
<CardDescription>
Set your timezone for accurate scheduling and timestamps.
          </CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
<div className="space-y-2">
<Label htmlFor="timezone-select">Your Timezone</Label>
<SelectPrimitive.Root
value={localLocale.timezone}
onValueChange={(v) => handleLocaleChange('timezone', v)}
              >
<SelectTrigger className="w-full md:w-96" disabled={isSaving}>
<SelectValue />
</SelectTrigger>
<SelectContent className="bg-background max-h-60">
{timezones.map((tz) => (
<SelectItem key={tz.value} value={tz.value}>
{tz.label}
</SelectItem>
                  ))}
</SelectContent>
</SelectPrimitive.Root>
</div>
</div>
</CardContent>
</Card>

{/* Date & Time Format */}
<Card className="border-border/40 py-4">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Calendar className="w-5 h-5 text-primary" aria-hidden="true" />
Date &amp; Time Format
          </CardTitle>
<CardDescription>
Customize how dates and times are displayed.
          </CardDescription>
</CardHeader>
<CardContent className="space-y-6">
{/* Date format */}
<div className="space-y-3">
<Label htmlFor="date-format-select">Date Format</Label>
<SelectPrimitive.Root
value={localLocale.dateFormat}
onValueChange={(v) => handleLocaleChange('dateFormat', v)}
            >
<SelectTrigger className="w-full md:w-60" disabled={isSaving}>
<SelectValue />
</SelectTrigger>
<SelectContent className="bg-background">
{dateFormats.map((format) => (
<SelectItem key={format.value} value={format.value}>
{format.label}
</SelectItem>
                ))}
</SelectContent>
</SelectPrimitive.Root>
</div>

{/* Time format */}
<div className="space-y-3">
<Label>Time Format</Label>
<RadioGroup
value={localLocale.timeFormat}
onValueChange={(v) => handleLocaleChange('timeFormat', v)}
disabled={isSaving}
className="flex gap-4"
            >
<div className="flex items-center space-x-2">
<RadioGroupItem value="12h" id="time-12h" />
<Label htmlFor="time-12h" className="cursor-pointer">
12-hour (1:30 PM)
                </Label>
</div>
<div className="flex items-center space-x-2">
<RadioGroupItem value="24h" id="time-24h" />
<Label htmlFor="time-24h" className="cursor-pointer">
24-hour (13:30)
                </Label>
</div>
</RadioGroup>
</div>

{/* Preview */}
<div className="p-4 rounded-lg bg-muted/30 border border-border/40">
<Label className="text-sm text-muted-foreground">Preview</Label>
<div className="mt-2 space-y-1">
<p className="text-sm">
<span className="text-muted-foreground">Date: </span>
{new Date().toLocaleDateString('en-US', {
year: 'numeric',
month: '2-digit',
day: '2-digit',
                })}
</p>
<p className="text-sm">
<span className="text-muted-foreground">Time: </span>
<span style={{ fontVariantNumeric: 'tabular-nums' }}>
{new Date().toLocaleTimeString('en-US', {
hour: '2-digit',
minute: '2-digit',
hour12: localLocale.timeFormat === '12h',
                  })}
</span>
</p>
</div>
</div>
</CardContent>
</Card>
</div>
  );
});
