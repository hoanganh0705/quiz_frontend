'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';

export function RedirectIfAuthed({ to = '/' }: { to?: string }) {
const router = useRouter();
const { isAuthenticated } = useAuthState();

useEffect(() => {
if (isAuthenticated) {
router.replace(to);
    }
  }, [isAuthenticated, router, to]);

if (isAuthenticated) {
return null;
  }

return null;
}
