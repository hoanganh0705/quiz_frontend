"use client";

import { useEffect, useRef } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

const AUTH_STATE_EVENT = "auth-state-change";

export interface UseSocialListLifecycleResetOptions {

targetUserId: string | null;

reset: () => void;
}

export function useSocialListLifecycleReset(
options: UseSocialListLifecycleResetOptions,
): void {
const { targetUserId, reset } = options;
const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const resetRef = useRef(reset);

const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);

useEffect(() => {

resetRef.current = reset;
  }, [reset]);

useEffect(() => {
if (typeof window === "undefined") return;
const onAuthStateChange = () => {

const next = readIsAuthenticatedFromWindow();
const was = wasAuthenticatedRef.current;
if (was === true && next === false) {

resetRef.current();
      }
wasAuthenticatedRef.current = next;
    };
window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
return () => {
window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, []);

useEffect(() => {

wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

void targetUserId;
}

function readIsAuthenticatedFromWindow(): boolean {
if (typeof document === "undefined") return false;
return /(?:^|;\s*)auth_token=/.test(document.cookie);
}

export const __testing = {
AUTH_STATE_EVENT,
readIsAuthenticatedFromWindow,
};
