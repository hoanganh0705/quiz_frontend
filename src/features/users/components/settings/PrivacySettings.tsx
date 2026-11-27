"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  BarChart3,
  Globe,
  Loader2,
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { useToast } from "@/lib/forms/useToast";

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
import { Switch } from "@/components/ui/Switch";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";
import type { UserPrivacySettingsDto } from "@/lib/api/generated/schemas";

export interface PrivacySettingsProps {
  profile: UserMeResponseDto | null;
}

type PrivacyKey = keyof Required<UserPrivacySettingsDto>;

interface PrivacyData {
  isPublic: boolean;
  showStatistics: boolean;
  showAchievements: boolean;
  showActivity: boolean;
  showRankImprovement: boolean;
  showTournamentActivity: boolean;
}

interface PrivacyToggle {
  key: PrivacyKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PRIVACY_TOGGLES: ReadonlyArray<PrivacyToggle> = [
  {
    key: "isPublic",
    label: "Public Profile",
    description:
      "Allow other players to discover and view your profile page.",
    icon: <Globe className="h-4 w-4" aria-hidden="true" />,
  },
  {
    key: "showStatistics",
    label: "Show Statistics",
    description: "Display your quiz stats and accuracy on your profile.",
    icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />,
  },
  {
    key: "showAchievements",
    label: "Show Achievements",
    description: "Display your earned badges and achievements on your profile.",
    icon: <Trophy className="h-4 w-4" aria-hidden="true" />,
  },
  {
    key: "showActivity",
    label: "Show Recent Activity",
    description: "Let others see your recent quiz completions and activity.",
    icon: <Activity className="h-4 w-4" aria-hidden="true" />,
  },
  {
    key: "showRankImprovement",
    label: "Show Rank Improvement",
    description:
      "Highlight your leaderboard rank changes and progression streaks.",
    icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
  },
  {
    key: "showTournamentActivity",
    label: "Show Tournament Activity",
    description:
      "Share your tournament registrations, placements, and history.",
    icon: <Swords className="h-4 w-4" aria-hidden="true" />,
  },
];

interface PrivacyToggleItemProps {
  toggle: PrivacyToggle;
  checked: boolean;
  disabled: boolean;
  isSaving: boolean;
  onToggle: (key: PrivacyKey, checked: boolean) => void;
}

const PrivacyToggleItem = memo(function PrivacyToggleItem({
  toggle,
  checked,
  disabled,
  isSaving,
  onToggle,
}: PrivacyToggleItemProps) {
  const switchId = `privacy-toggle-${toggle.key}`;

  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
          {toggle.icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <Label
            htmlFor={switchId}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {toggle.label}
          </Label>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {toggle.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isSaving && (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Switch
          id={switchId}
          checked={checked}
          onCheckedChange={(next) => onToggle(toggle.key, next)}
          disabled={disabled || isSaving}
          aria-label={`Toggle ${toggle.label}`}
        />
      </div>
    </div>
  );
});

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export const PrivacySettings = memo(function PrivacySettings({
  profile,
}: PrivacySettingsProps) {
  const updateSettings = useUpdateMySettings({});
  const toast = useToast();

  const defaultPrivacy = useMemo<PrivacyData>(() => {
    const stored = (profile?.settings as Record<string, unknown> | undefined)
      ?.privacy as UserPrivacySettingsDto | undefined;
    return {
      isPublic: readBoolean(stored?.isPublic, true),
      showStatistics: readBoolean(stored?.showStatistics, true),
      showAchievements: readBoolean(stored?.showAchievements, true),
      showActivity: readBoolean(stored?.showActivity, true),
      showRankImprovement: readBoolean(stored?.showRankImprovement, true),
      showTournamentActivity: readBoolean(stored?.showTournamentActivity, true),
    };
  }, [profile]);

  const [localPrivacy, setLocalPrivacy] = useState<PrivacyData>(defaultPrivacy);
  const [savingKey, setSavingKey] = useState<PrivacyKey | null>(null);

  useEffect(() => {
    setLocalPrivacy(defaultPrivacy);
  }, [defaultPrivacy]);

  useEffect(() => {
    if (!updateSettings.isPending) {
      setSavingKey(null);
    }
  }, [updateSettings.isPending]);

  useEffect(() => {
    if (updateSettings.isError) {
      setLocalPrivacy(defaultPrivacy);
    }
  }, [updateSettings.isError, defaultPrivacy]);

  useEffect(() => {
    if (updateSettings.isSuccess) {
      toast.push({
        title: "Privacy settings saved",
        body: "Your changes have been saved.",
        durationMs: 3000,
      });
      updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

  const handleToggle = useCallback(
    (key: PrivacyKey, checked: boolean) => {
      const updated: PrivacyData = { ...localPrivacy, [key]: checked };
      setLocalPrivacy(updated);
      setSavingKey(key);
      void updateSettings.mutate({
        privacy: updated,
      });
    },
    [localPrivacy, updateSettings],
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
          Privacy Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Control who can see your profile and quiz activity.
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
              Visibility &amp; Activity Controls
            </h3>
          </CardTitle>
          <CardDescription>
            Choose which sections of your profile and activity are visible to
            other players.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 divide-y divide-border/60">
          {PRIVACY_TOGGLES.map((toggle) => (
            <PrivacyToggleItem
              key={toggle.key}
              toggle={toggle}
              checked={localPrivacy[toggle.key]}
              disabled={isSaving}
              isSaving={isSaving && savingKey === toggle.key}
              onToggle={handleToggle}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
});
