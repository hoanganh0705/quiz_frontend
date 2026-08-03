'use client';

/**
 * `PrivacySettings` — privacy controls section of the settings page.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.C3.
 *
 * ## What this component owns
 *
 * Reads `privacy` from `profile.settings` (passed as prop), renders
 * privacy toggles and a profile-visibility select, and calls
 * `useUpdateMySettings.mutate({ privacy: updated })` on each change.
 * Privacy changes are a partial PATCH — only the changed fields are sent.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useToast } from '@/lib/forms/useToast';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { useUpdateMySettings } from '@/features/users/hooks/useUpdateMySettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import {
  Shield,
  Eye,
  History,
  Trophy,
  Users,
  BarChart3,
  Activity,
  Globe,
  Lock,
  UserCheck,
  Check,
  Loader2,
} from 'lucide-react';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface PrivacySettingsProps {
  profile: UserMeResponseDto | null;
}

// ─── Types ─────────────────────────────────────────────────────────────────

type ProfileVisibility = 'public' | 'friends' | 'private';

interface PrivacyToggle {
  key: keyof Omit<PrivacyData, 'profileVisibility'>;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface PrivacyData {
  profileVisibility: ProfileVisibility;
  showOnlineStatus: boolean;
  showQuizHistory: boolean;
  showAchievements: boolean;
  allowFriendRequests: boolean;
  showInLeaderboard: boolean;
  shareActivityWithFriends: boolean;
}

const PRIVACY_TOGGLES: PrivacyToggle[] = [
  {
    key: 'showOnlineStatus',
    label: 'Show Online Status',
    description: 'Let others see when you are online.',
    icon: <Eye className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'showQuizHistory',
    label: 'Show Quiz History',
    description: 'Allow others to view your quiz history.',
    icon: <History className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'showAchievements',
    label: 'Show Achievements',
    description: 'Display your achievements on your profile.',
    icon: <Trophy className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'allowFriendRequests',
    label: 'Allow Friend Requests',
    description: 'Let others send you friend requests.',
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'showInLeaderboard',
    label: 'Show in Leaderboard',
    description: 'Appear in public leaderboards and rankings.',
    icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'shareActivityWithFriends',
    label: 'Share Activity with Friends',
    description: 'Let friends see your recent quiz activities.',
    icon: <Activity className="w-4 h-4" aria-hidden="true" />,
  },
];

// ─── Privacy toggle item ─────────────────────────────────────────────────────

interface PrivacyToggleItemProps {
  toggle: PrivacyToggle;
  checked: boolean;
  disabled: boolean;
  isSaving: boolean;
  onToggle: (key: PrivacyToggle['key'], checked: boolean) => void;
}

const PrivacyToggleItem = memo(function PrivacyToggleItem({
  toggle,
  checked,
  disabled,
  isSaving,
  onToggle,
}: PrivacyToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{toggle.icon}</div>
        <div>
          <Label className="text-base font-medium">{toggle.label}</Label>
          <p className="text-sm text-muted-foreground">{toggle.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSaving && (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Switch
          checked={checked}
          onCheckedChange={(next) => onToggle(toggle.key, next)}
          disabled={disabled || isSaving}
          aria-label={`Toggle ${toggle.label}`}
        />
      </div>
    </div>
  );
});

// ─── Visibility icon helper ──────────────────────────────────────────────────

function getVisibilityIcon(visibility: ProfileVisibility) {
  switch (visibility) {
    case 'public':
      return <Globe className="w-4 h-4" aria-hidden="true" />;
    case 'friends':
      return <UserCheck className="w-4 h-4" aria-hidden="true" />;
    case 'private':
      return <Lock className="w-4 h-4" aria-hidden="true" />;
  }
}

// ─── Root component ─────────────────────────────────────────────────────────

export const PrivacySettings = memo(function PrivacySettings({
  profile,
}: PrivacySettingsProps) {
  const updateSettings = useUpdateMySettings({});
  const toast = useToast();

  // Default privacy values.
  const defaultPrivacy = useMemo<PrivacyData>(() => {
    const stored = (
      profile?.settings as Record<string, unknown> | undefined
    )?.privacy as Record<string, unknown> | undefined;
    return {
      profileVisibility:
        (stored?.profileVisibility as ProfileVisibility) ?? 'public',
      showOnlineStatus: (stored?.showOnlineStatus as boolean) ?? true,
      showQuizHistory: (stored?.showQuizHistory as boolean) ?? true,
      showAchievements: (stored?.showAchievements as boolean) ?? true,
      allowFriendRequests: (stored?.allowFriendRequests as boolean) ?? true,
      showInLeaderboard: (stored?.showInLeaderboard as boolean) ?? true,
      shareActivityWithFriends:
        (stored?.shareActivityWithFriends as boolean) ?? true,
    };
  }, [profile]);

  const [localPrivacy, setLocalPrivacy] = useState(defaultPrivacy);

  // Sync when profile changes.
  useEffect(() => {
    setLocalPrivacy(defaultPrivacy);
  }, [defaultPrivacy]);

  // Show toast on success.
  useEffect(() => {
    if (updateSettings.isSuccess) {
      toast.push({
        title: 'Privacy settings saved',
        body: 'Your changes have been saved.',
        durationMs: 3000,
      });
      updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

  const handleToggle = useCallback(
    (key: PrivacyToggle['key'], checked: boolean) => {
      const updated: PrivacyData = { ...localPrivacy, [key]: checked };
      setLocalPrivacy(updated);
      updateSettings.mutate(
        { privacy: updated as unknown as Parameters<typeof updateSettings.mutate>[0] } as Parameters<typeof updateSettings.mutate>[0],
      );
    },
    [localPrivacy, updateSettings],
  );

  const handleVisibilityChange = useCallback(
    (value: ProfileVisibility) => {
      const updated: PrivacyData = { ...localPrivacy, profileVisibility: value };
      setLocalPrivacy(updated);
      updateSettings.mutate(
        { privacy: updated as unknown as Parameters<typeof updateSettings.mutate>[0] } as Parameters<typeof updateSettings.mutate>[0],
      );
    },
    [localPrivacy, updateSettings],
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
        <h3 className="text-lg font-semibold">Privacy Settings</h3>
        <p className="text-sm text-muted-foreground">
          Control who can see your profile and activity.
        </p>
      </div>

      {/* Profile visibility */}
      <Card className="border-border/40 py-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Choose who can see your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {getVisibilityIcon(localPrivacy.profileVisibility)}
              </div>
              <div>
                <Label className="text-base font-medium">
                  Who can see your profile?
                </Label>
                <p className="text-sm text-muted-foreground">
                  Control the visibility of your profile page.
                </p>
              </div>
            </div>
            <Select
              value={localPrivacy.profileVisibility}
              onValueChange={(v) => handleVisibilityChange(v as ProfileVisibility)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-40" aria-label="Profile visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
                    Friends Only
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity privacy toggles */}
      <Card className="border-border/40 py-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
            Activity Privacy
          </CardTitle>
          <CardDescription>
            Manage what others can see about your activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {PRIVACY_TOGGLES.map((toggle) => (
            <PrivacyToggleItem
              key={toggle.key}
              toggle={toggle}
              checked={localPrivacy[toggle.key]}
              disabled={false}
              isSaving={isSaving}
              onToggle={handleToggle}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
});
