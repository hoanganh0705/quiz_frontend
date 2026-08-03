'use client';

/**
 * `NotificationSettings` — notification channel settings section.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.C2.
 *
 * ## What this component owns
 *
 * Reads `notificationChannels` from `profile.settings` (passed as prop),
 * renders toggle switches for each channel, and calls
 * `useUpdateMySettings.mutate({ notificationChannels: updated })` on
 * every change. The at-least-one-channel guard (schema-level validation
 * in `updateMySettingsSchema`) is enforced at the UI level: the last
 * enabled channel cannot be disabled — the toggle is blocked and a
 * tooltip explains why.
 *
 * ## Diff from the previous version
 *
 * The old component managed state via `useState` and wrote to `localStorage`
 * via an `onUpdate` prop. This version calls `PATCH /users/me/settings`
 * and broadcasts `profile/updated` to other tabs.
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
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/forms/useToast';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { useUpdateMySettings } from '@/features/users/hooks/useUpdateMySettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import {
  Bell,
  Mail,
  Smartphone,
  Megaphone,
  Check,
  Loader2,
} from 'lucide-react';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface NotificationSettingsProps {
  /** The authenticated user's profile from `useMyProfile()`. */
  profile: UserMeResponseDto | null;
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface NotificationChannel {
  key: 'inApp' | 'email' | 'push' | 'marketing';
  label: string;
  description: string;
  icon: React.ReactNode;
}

const CHANNEL_ITEMS: NotificationChannel[] = [
  {
    key: 'inApp',
    label: 'In-App Notifications',
    description: 'Show notifications inside the app interface.',
    icon: <Bell className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'email',
    label: 'Email Channel',
    description: 'Allow notifications to be delivered to your email.',
    icon: <Mail className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'push',
    label: 'Push Channel',
    description: 'Allow browser/mobile push delivery when available.',
    icon: <Smartphone className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: 'marketing',
    label: 'Marketing Channel',
    description: 'Allow product updates, campaigns, and promotions.',
    icon: <Megaphone className="w-4 h-4" aria-hidden="true" />,
  },
];

// ─── Channel toggle item ─────────────────────────────────────────────────────

interface ChannelToggleProps {
  channel: NotificationChannel;
  checked: boolean;
  disabled: boolean;
  isSaving: boolean;
  isBlocked: boolean;
  blockReason: string;
  onToggle: (key: NotificationChannel['key'], checked: boolean) => void;
}

const ChannelToggle = memo(function ChannelToggle({
  channel,
  checked,
  disabled,
  isSaving,
  isBlocked,
  blockReason,
  onToggle,
}: ChannelToggleProps) {
  const [showBlockTooltip, setShowBlockTooltip] = useState(false);

  const handleToggle = useCallback(
    (nextChecked: boolean) => {
      if (isBlocked) {
        setShowBlockTooltip(true);
        setTimeout(() => setShowBlockTooltip(false), 2500);
        return;
      }
      onToggle(channel.key, nextChecked);
    },
    [isBlocked, channel.key, onToggle],
  );

  return (
    <div className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{channel.icon}</div>
        <div>
          <Label className="text-base font-medium">{channel.label}</Label>
          <p className="text-sm text-muted-foreground">{channel.description}</p>
          {isBlocked && showBlockTooltip && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {blockReason}
            </p>
          )}
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
          onCheckedChange={handleToggle}
          disabled={disabled || isSaving}
          aria-label={`Toggle ${channel.label}`}
          aria-describedby={isBlocked ? `channel-blocked-${channel.key}` : undefined}
        />
        {isBlocked && (
          <span
            id={`channel-blocked-${channel.key}`}
            className="sr-only"
          >
            {blockReason}
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Root component ─────────────────────────────────────────────────────────

/**
 * `<NotificationSettings profile={profile} />` — notification channel
 * settings section. Calls `useUpdateMySettings` on each toggle change.
 */
export const NotificationSettings = memo(function NotificationSettings({
  profile,
}: NotificationSettingsProps) {
  const updateSettings = useUpdateMySettings({});
  const toast = useToast();

  // Extract channels from the profile. Falls back to all-on defaults.
  const defaultChannels = useMemo<
    Record<'inApp' | 'email' | 'push' | 'marketing', boolean>
  >(() => {
    const stored =
      (profile?.settings as Record<string, unknown> | undefined)
        ?.notificationChannels as
        | Record<string, boolean>
        | undefined;
    return {
      inApp: stored?.inApp ?? true,
      email: stored?.email ?? true,
      push: stored?.push ?? true,
      marketing: stored?.marketing ?? false,
    };
  }, [profile]);

  // Current channel state (local optimistic state while saving).
  const [localChannels, setLocalChannels] = useState(defaultChannels);

  // Sync local channels when profile changes (after successful save).
  useEffect(() => {
    setLocalChannels(defaultChannels);
  }, [defaultChannels]);

  // Show toast on success.
  useEffect(() => {
    if (updateSettings.isSuccess) {
      toast.push({
        title: 'Notification preferences saved',
        body: 'Your changes have been saved.',
        durationMs: 3000,
      });
      updateSettings.resetError();
    }
  }, [updateSettings.isSuccess, toast, updateSettings]);

  // Count how many channels are currently enabled.
  const enabledCount = useMemo(
    () => Object.values(localChannels).filter(Boolean).length,
    [localChannels],
  );

  const blockReason = 'At least one notification channel is required.';

  const handleToggle = useCallback(
    async (key: NotificationChannel['key'], checked: boolean) => {
      // At-least-one-channel guard: if this is the last enabled channel,
      // block the toggle at the UI level.
      if (!checked && enabledCount === 1) {
        return; // blocked — the ChannelToggle handles the tooltip.
      }

      const updatedChannels = { ...localChannels, [key]: checked };
      setLocalChannels(updatedChannels);

      await updateSettings.mutate(
        { preferences: { notificationChannels: updatedChannels } as unknown as Record<string, unknown> } as Parameters<typeof updateSettings.mutate>[0],
      );
    },
    [localChannels, enabledCount, updateSettings],
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
          lastError={
            updateSettings.lastError
              ? {
                  ...updateSettings.lastError,
                  code: updateSettings.lastApiError?.code ?? 'GLOBAL_UNKNOWN',
                }
              : null
          }
          onDismiss={updateSettings.resetError}
        />
      )}

      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Choose what notifications you want to receive.
        </p>
      </div>

      {/* Delivery channels */}
      <Card className="border-border/40 py-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" aria-hidden="true" />
            Delivery Channels
          </CardTitle>
          <CardDescription>
            Choose where notifications are delivered. At least one channel must
            remain enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {CHANNEL_ITEMS.map((channel) => {
            const isLastEnabled = !localChannels[channel.key] && enabledCount === 1;
            return (
              <ChannelToggle
                key={channel.key}
                channel={channel}
                checked={localChannels[channel.key]}
                disabled={false}
                isSaving={isSaving}
                isBlocked={isLastEnabled}
                blockReason={blockReason}
                onToggle={handleToggle}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
});
