"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/lib/forms/useToast";

import {
  dateFormats,
  languages,
  timezones,
} from "@/features/users/constants/settings";
import { useUpdateMySettings } from "@/features/users/hooks/useUpdateMySettings";

import { FormErrorBanner } from "@/components/primitives/form/FormErrorBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

import { useAppLanguage } from "@/shared/hooks/use-app-language";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";

export interface LanguageSettingsProps {
  profile: UserMeResponseDto | null;
}

interface LocaleData {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

function getDateParts(
  date: Date,
  timeZone: string,
): { day: string; monthNum: string; monthShort: string; year: string } {
  const buildParts = (tz?: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(tz ? { timeZone: tz } : {}),
    });
    const monthShortFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      ...(tz ? { timeZone: tz } : {}),
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return {
      day: get("day"),
      monthNum: get("month"),
      monthShort: monthShortFormatter.format(date),
      year: get("year"),
    };
  };

  try {
    return buildParts(timeZone);
  } catch {
    return buildParts("UTC");
  }
}

export function formatDateWithPattern(
  date: Date,
  pattern: string,
  timeZone: string,
): string {
  const { day, monthNum, monthShort, year } = getDateParts(date, timeZone);

  switch (pattern) {
    case "DD/MM/YYYY":
      return `${day}/${monthNum}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${monthNum}-${day}`;
    case "DD MMM YYYY":
      return `${day} ${monthShort} ${year}`;
    case "MMM DD, YYYY":
      return `${monthShort} ${day}, ${year}`;
    case "MM/DD/YYYY":
    default:
      return `${monthNum}/${day}/${year}`;
  }
}

function formatTimeWithPreference(
  date: Date,
  timeFormat: string,
  timeZone: string,
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  };

  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: "UTC",
    }).format(date);
  }
}

export const LanguageSettings = memo(function LanguageSettings({
  profile,
}: LanguageSettingsProps) {
  const updateSettings = useUpdateMySettings({});
  const toast = useToast();
  const { setLanguage } = useAppLanguage();

  const defaultLocale = useMemo<LocaleData>(() => {
    const settings = profile?.settings as Record<string, unknown> | undefined;
    const stored =
      (settings?.preferences as Record<string, unknown> | undefined) ??
      (settings?.locale as Record<string, unknown> | undefined) ??
      settings;
    return {
      language: (stored?.language as string) ?? "en",
      timezone: (stored?.timezone as string) ?? "UTC",
      dateFormat: (stored?.dateFormat as string) ?? "MM/DD/YYYY",
      timeFormat: (stored?.timeFormat as string) ?? "12h",
    };
  }, [profile]);

  const [localLocale, setLocalLocale] = useState(defaultLocale);
  const [previewDate, setPreviewDate] = useState<Date>(
    () => new Date("2026-08-09T13:30:00Z"),
  );

  useEffect(() => {
    setPreviewDate(new Date());
  }, []);

  useEffect(() => {
    setLocalLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    if (updateSettings.isError) {
      setLocalLocale(defaultLocale);
    }
  }, [updateSettings.isError, defaultLocale]);

  useEffect(() => {
    if (updateSettings.isSuccess) {
      toast.push({
        title: "Language preferences saved",
        body: "Your changes have been saved.",
        durationMs: 3000,
      });
      updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

  const handleLocaleChange = useCallback(
    (key: keyof LocaleData, value: string) => {
      const updated: LocaleData = { ...localLocale, [key]: value };
      setLocalLocale(updated);

      if (key === "language") {
        setLanguage(value);
      }

      updateSettings.mutate({
        preferences: updated as unknown as Record<string, unknown>,
      } as Parameters<typeof updateSettings.mutate>[0]);
    },
    [localLocale, setLanguage, updateSettings],
  );

  const formattedDatePreview = useMemo(
    () =>
      formatDateWithPattern(
        previewDate,
        localLocale.dateFormat,
        localLocale.timezone,
      ),
    [previewDate, localLocale.dateFormat, localLocale.timezone],
  );

  const formattedTimePreview = useMemo(
    () =>
      formatTimeWithPreference(
        previewDate,
        localLocale.timeFormat,
        localLocale.timezone,
      ),
    [previewDate, localLocale.timeFormat, localLocale.timezone],
  );

  const isSaving = updateSettings.isPending;

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Language &amp; Region
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize your interface language, timezone, and timestamp formats.
        </p>
      </div>

      {updateSettings.lastError && (
        <FormErrorBanner
          lastError={{
            ...updateSettings.lastError,
            code: updateSettings.lastApiError?.code ?? "GLOBAL_UNKNOWN",
          }}
          onDismiss={updateSettings.resetError}
        />
      )}

      <Card className="bg-card border-border rounded-xl gap-0 py-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/60">
          <CardTitle>
            <h3 className="text-base font-semibold text-foreground">
              Regional Preferences
            </h3>
          </CardTitle>
          <CardDescription>
            Applied to quiz timestamps, schedules, and interface labels.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="language-select">Display Language</Label>
              <Select
                value={localLocale.language}
                onValueChange={(v) => handleLocaleChange("language", v)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="language-select"
                  className="w-full h-10 sm:h-9"
                  disabled={isSaving}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Updates interface copy across QuizHub.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone-select">Your Timezone</Label>
              <Select
                value={localLocale.timezone}
                onValueChange={(v) => handleLocaleChange("timezone", v)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="timezone-select"
                  className="w-full h-10 sm:h-9"
                  disabled={isSaving}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-60">
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for daily challenges and live battle schedules.
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            <div className="space-y-2">
              <Label htmlFor="date-format-select">Date Format</Label>
              <Select
                value={localLocale.dateFormat}
                onValueChange={(v) => handleLocaleChange("dateFormat", v)}
                disabled={isSaving}
              >
                <SelectTrigger
                  id="date-format-select"
                  className="w-full h-10 sm:h-9"
                  disabled={isSaving}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                Time Format
              </legend>
              <RadioGroup
                value={localLocale.timeFormat}
                onValueChange={(v) => handleLocaleChange("timeFormat", v)}
                disabled={isSaving}
                className="flex flex-wrap gap-2.5"
              >
                <Label
                  htmlFor="time-12h"
                  className="inline-flex min-h-10 sm:min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-normal cursor-pointer transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5"
                >
                  <RadioGroupItem value="12h" id="time-12h" />
                  <span>12-hour (1:30 PM)</span>
                </Label>
                <Label
                  htmlFor="time-24h"
                  className="inline-flex min-h-10 sm:min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-normal cursor-pointer transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-brand/5"
                >
                  <RadioGroupItem value="24h" id="time-24h" />
                  <span>24-hour (13:30)</span>
                </Label>
              </RadioGroup>
            </fieldset>
          </div>

          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-lg bg-muted/40 border border-border/80 text-sm"
            data-testid="locale-format-preview"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </span>
            <span>
              <span className="text-muted-foreground">Date: </span>
              <span
                className="font-mono tabular-nums text-foreground"
                data-testid="date-format-preview-value"
              >
                {formattedDatePreview}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Time: </span>
              <span
                className="font-mono tabular-nums text-foreground"
                data-testid="time-format-preview-value"
              >
                {formattedTimePreview}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
