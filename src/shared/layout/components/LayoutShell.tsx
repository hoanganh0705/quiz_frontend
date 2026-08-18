"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { mutate as globalMutate } from "swr";
import { AppSidebar } from "@/shared/layout/components/AppSidebar";
import { AppHeader } from "@/shared/layout/components/AppHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { QuickSearch } from "@/shared/ui";
import { ShortcutsHelpModal } from "@/shared/ui";
import { AppBreadcrumbs } from "@/shared/layout/components/AppBreadcrumbs";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CoinBalanceSyncLayer } from "@/features/coins/components/CoinBalanceSyncLayer";
import { RewardToast } from "@/features/coins/components/RewardToast";
import { getAuthToken } from "@/features/auth/utils/auth-cookies";
import {
useUser,
useIsUserLoading,
useFetchCurrentUser,
useUserStore,
} from "@/features/users/store/user-store";
import { useResetCoinStore } from "@/features/coins/store/coin-store";

const SHELL_PREFIXES = [
"/bookmarks",
"/categories",
"/create-quiz",
"/daily-challenge",
"/friends",
"/leaderboard",
"/my-profile",
"/notifications",
"/onboarding",
"/profile",
"/quiz-history",
"/quizzes",
"/settings",
"/support",
"/tournament",
] as const;

const SHELL_EXACT_PATHS = ["/"] as const;

const AUTH_PAGES = [
"/login",
"/signup",
"/forgot-password",
"/resend-verification",
"/verify-email",
] as const;

function isShellPage(pathname: string | undefined): boolean {
if (!pathname) return true;
if (SHELL_EXACT_PATHS.some((p) => pathname === p)) return true;
return SHELL_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthPage(pathname: string | undefined): boolean {
if (!pathname) return false;
return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p));
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
const pathname = usePathname();
const router = useRouter();
const { currentUser, isLoading: isAuthLoading } = useAuth();
const user = useUser();
const isUserLoading = useIsUserLoading();
const fetchCurrentUser = useFetchCurrentUser();
const resetCoinStore = useResetCoinStore();

useEffect(() => {
if (currentUser === null) {
resetCoinStore();
    }
  }, [currentUser, resetCoinStore]);

useEffect(() => {
useUserStore.persist.rehydrate();
  }, []);

const lastSeenUserIdRef = useRef<string | null>(null);
useEffect(() => {
if (typeof window === "undefined") return;
const currentUserId = user?.userId ?? null;
const lastSeen = lastSeenUserIdRef.current;

if (currentUserId === null && lastSeen === null) return;

if (lastSeen === currentUserId) return;

lastSeenUserIdRef.current = currentUserId;
try {
void globalMutate(() => true, undefined, { revalidate: true });
    } catch {
      // Fail-open: SWR may not be initialized yet.
    }
    // We intentionally do NOT depend on `user` identity — Zustand may
    // push a new object on every internal mutation. We depend on the
    // id string so equal ids do not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

const attemptRef = useRef<{ count: number; lastErrorAt: number | null }>({
count: 0,
lastErrorAt: null,
  });

useEffect(() => {
if (!currentUser) {

attemptRef.current = { count: 0, lastErrorAt: null };
return;
    }
if (user) return;
if (isUserLoading) return;

const now = Date.now();
if (
attemptRef.current.lastErrorAt !== null &&
now - attemptRef.current.lastErrorAt < 30_000
    ) {
return;
    }

attemptRef.current.count += 1;
void fetchCurrentUser().then(
() => {
attemptRef.current.lastErrorAt = null;
      },
() => {
attemptRef.current.lastErrorAt = Date.now();
      },
    );
    // Intentionally NOT depending on `user` reference (Zustand pushes
    // a new object on every store change). Depending on `user` would
    // re-run this effect on every internal mutation (cross-tab sync,
    // profile broadcast, etc.) and could re-trigger the fetch.
    //
    // External triggers that SHOULD re-run this effect:
    //   - `currentUser` flipping true/false (login, logout)
    //   - `pathname` changing (route navigation — fresh attempt budget)
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCurrentUser, currentUser, isUserLoading, pathname]);

useEffect(() => {
const protectedPrefixes = [
"/bookmarks",
"/settings",
"/my-profile",
"/quiz-history",
"/friends",
"/notifications",
"/tournament",
"/create-quiz",
"/onboarding",
    ];
const isProtected = protectedPrefixes.some((p) => pathname?.startsWith(p));
const hasToken = !!getAuthToken();

if (isProtected && !isAuthLoading && !currentUser && !hasToken) {
router.replace(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [isAuthLoading, currentUser, pathname, router]);

if (isAuthPage(pathname)) {
return <>{children}</>;
  }

if (!isShellPage(pathname)) {
return <>{children}</>;
  }

return (
<SidebarProvider>
<AppSidebar />
<SidebarInset className="overflow-x-hidden">
<AppHeader />
<AppBreadcrumbs />
<main
id="main-content"
className="pt-3 overflow-x-hidden max-w-full app-page-transition"
        >
{children}
</main>
</SidebarInset>

<QuickSearch />
<ShortcutsHelpModal />
<CoinBalanceSyncLayer />
<RewardToast />
</SidebarProvider>
  );
}
