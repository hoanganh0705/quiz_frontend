"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

const AUTH_STATE_EVENT = "auth-state-change";

export interface UseSocialLifecycleResetOptions {

targetUserId?: string | null;

listReset?: () => void;

periodReset?: () => void;
}

function readIsAuthenticatedFromWindow(): boolean {
if (typeof document === "undefined") return false;
return /(?:^|;\s*)auth_token=/.test(document.cookie);
}

export function useSocialLifecycleReset(
options: UseSocialLifecycleResetOptions,
): void {
const { targetUserId, listReset, periodReset } = options;
const pathname = usePathname() ?? "";
const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const listResetRef = useRef(listReset);
const periodResetRef = useRef(periodReset);

const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);

useEffect(() => {
listResetRef.current = listReset;
periodResetRef.current = periodReset;
  }, [listReset, periodReset]);

useEffect(() => {
if (typeof window === "undefined") return;
const onAuthStateChange = () => {
const next = readIsAuthenticatedFromWindow();
const was = wasAuthenticatedRef.current;
if (was === true && next === false) {

if (pathname.startsWith("/social/me/analytics")) {
periodResetRef.current?.();
        } else if (
targetUserId &&
pathname.startsWith(`/social/users/${targetUserId}`)
        ) {
listResetRef.current?.();
        }
      }
wasAuthenticatedRef.current = next;
    };
window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
return () => {
window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, [pathname, targetUserId]);

useEffect(() => {
wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
}

export const __testing = {
AUTH_STATE_EVENT,
readIsAuthenticatedFromWindow,
};