'use client';

import { memo } from 'react';
import { useMyProfile } from '@/features/users/hooks/useMyProfile';
import { EditProfileForm } from '@/features/users/components/my-profile/EditProfileForm';

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
