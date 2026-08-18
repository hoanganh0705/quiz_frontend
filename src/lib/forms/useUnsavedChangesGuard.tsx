'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface UseUnsavedChangesGuardOptions {

isDirty: boolean;

thresholdMs?: number;
}

export interface UseUnsavedChangesGuardReturn {

isGuarding: boolean;

pendingPopstate: boolean;

pendingPathname: string | null;

cancelPendingPopstate: () => void;

confirmPendingPopstate: () => void;
}

export const DEFAULT_THRESHOLD_MS = 5000;

export function useUnsavedChangesGuard(
options: UseUnsavedChangesGuardOptions
): UseUnsavedChangesGuardReturn {
const { isDirty, thresholdMs = DEFAULT_THRESHOLD_MS } = options;

const pathname = usePathname();
const router = useRouter();

const dirtySinceRef = useRef<number | null>(null);
const lastPathnameRef = useRef<string | null>(pathname ?? null);
const [isGuarding, setIsGuarding] = useState(false);

const [pendingPopstate, setPendingPopstate] = useState(false);
const [pendingPathname, setPendingPathname] = useState<string | null>(null);

useEffect(() => {
if (isDirty && dirtySinceRef.current === null) {
dirtySinceRef.current = Date.now();
    } else if (!isDirty && dirtySinceRef.current !== null) {
dirtySinceRef.current = null;
    }
  }, [isDirty]);

const guardPredicate =
isDirty &&
dirtySinceRef.current !== null &&
Date.now() - dirtySinceRef.current > thresholdMs;

useEffect(() => {
setIsGuarding(guardPredicate);
  }, [guardPredicate]);

const onBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
event.preventDefault();
event.returnValue = '';
  }, []);

const onPopState = useCallback(() => {
if (!isGuarding) return;
setPendingPopstate(true);
setPendingPathname(lastPathnameRef.current);
  }, [isGuarding]);

useEffect(() => {
if (typeof window === 'undefined') return;
if (!isGuarding) return;
window.addEventListener('beforeunload', onBeforeUnload);
window.addEventListener('popstate', onPopState);
return () => {
window.removeEventListener('beforeunload', onBeforeUnload);
window.removeEventListener('popstate', onPopState);
    };
  }, [isGuarding, onBeforeUnload, onPopState]);

useEffect(() => {
lastPathnameRef.current = pathname ?? null;
  }, [pathname]);

const cancelPendingPopstate = useCallback(() => {

if (lastPathnameRef.current !== null) {
router.push(lastPathnameRef.current);
    }
setPendingPopstate(false);
setPendingPathname(null);
  }, [router]);

const confirmPendingPopstate = useCallback(() => {

setPendingPopstate(false);
setPendingPathname(null);
  }, []);

return {
isGuarding,
pendingPopstate,
pendingPathname,
cancelPendingPopstate,
confirmPendingPopstate,
  };
}