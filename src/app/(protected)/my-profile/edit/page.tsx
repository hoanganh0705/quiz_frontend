'use client';

/**
 * `my-profile/edit/page.tsx` — standalone route for profile editing.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.D2.
 *
 * ## What this page owns
 *
 * Calls `useMyProfile()`, renders a loading skeleton until the profile
 * is hydrated, and mounts `<EditProfileForm />` once `profile` is non-null.
 * The form itself lives in `features/users/components/my-profile/EditProfileForm.tsx`.
 */

import { memo } from 'react';
import { useMyProfile } from '@/features/users/hooks/useMyProfile';
import { EditProfileForm } from '@/features/users/components/my-profile/EditProfileForm';

const EditProfilePage = memo(function EditProfilePage() {
  const { profile, isHydrated } = useMyProfile();

  return (
    <main className="min-h-screen bg-transparent text-foreground mt-20">
      <header className="text-center px-4 mb-8">
        <h1 className="text-3xl font-bold mb-4">Edit Profile</h1>
        <p className="text-foreground/70 text-base max-w-2xl mx-auto">
          Update your profile information and public presence.
        </p>
      </header>

      <div className="px-4 pb-12 max-w-2xl mx-auto">
        {!isHydrated || profile === null ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-48 rounded-lg bg-muted" />
            <div className="h-32 rounded-lg bg-muted" />
            <div className="h-48 rounded-lg bg-muted" />
          </div>
        ) : (
          <EditProfileForm profile={profile} />
        )}
      </div>
    </main>
  );
});

export default EditProfilePage;
