'use client';

/**
 * `ProfileEditTab` — tab wrapper for the edit profile form.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.D2.
 *
 * ## What this component owns
 *
 * Calls `useMyProfile()`, renders a skeleton while `isHydrated === false`,
 * and mounts `<EditProfileForm />` when `profile` is non-null.
 */

import { memo } from 'react';
import { useMyProfile } from '@/features/users/hooks/useMyProfile';
import { EditProfileForm } from '@/features/users/components/my-profile/EditProfileForm';

/**
 * `<ProfileEditTab />` — thin wrapper that bridges `useMyProfile()` to
 * `<EditProfileForm />`.
 */
export const ProfileEditTab = memo(function ProfileEditTab() {
  const { profile, isHydrated } = useMyProfile();

  if (!isHydrated || profile === null) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-48 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
    );
  }

  return <EditProfileForm profile={profile} />;
});
