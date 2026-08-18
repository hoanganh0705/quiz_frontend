'use client';

import {
useEffect,
useRef,
type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
isDeletionFinalized,
} from '@/features/auth/lifecycle/deletion-finalization';
import {
DELETION_PUBLIC_LANDING_PATH,
} from '@/features/auth/lifecycle/deletion-history';

export interface DeletionGuardProps {
children: ReactNode;

fallback?: ReactNode;
}

export function DeletionGuard({
children,
fallback = null,
}: DeletionGuardProps): React.JSX.Element | null {
const router = useRouter();

const hasRedirectedRef = useRef(false);

const isTerminal = isDeletionFinalized();

useEffect(() => {
if (!isTerminal) return;
if (hasRedirectedRef.current) return;
hasRedirectedRef.current = true;
router.replace(DELETION_PUBLIC_LANDING_PATH);
  }, [isTerminal, router]);

if (isTerminal) {
return fallback as React.JSX.Element | null;
  }

return <>{children}</>;
}

export function useDeletionGuardActive(): boolean {
return isDeletionFinalized();
}
