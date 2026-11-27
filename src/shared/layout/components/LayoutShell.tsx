"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { getQueryClient } from "@/providers/QueryProvider";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getAuthToken } from "@/features/auth/utils/auth-cookies";
import { CoinBalanceSyncLayer } from "@/features/coins/components/CoinBalanceSyncLayer";
import { RewardToast } from "@/features/coins/components/RewardToast";
import { useResetCoinStore } from "@/features/coins/store/coin-store";
import {
  useFetchCurrentUser,
  useIsUserLoading,
  useUser,
  useUserStore,
} from "@/features/users/store/user-store";

import { SidebarInset, SidebarProvider } from "@/components/ui/Sidebar";

import {
  isAuthRoute,
  isProtectedRoute,
  isShellRoute,
} from "@/shared/config/routes";
import { AppBreadcrumbs } from "@/shared/layout/components/AppBreadcrumbs";
import { AppHeader } from "@/shared/layout/components/AppHeader";
import { AppSidebar } from "@/shared/layout/components/AppSidebar";
import { QuickSearch, ShortcutsHelpModal } from "@/shared/ui";

import type React from "react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isAuthenticated,
    isBootstrapping: isAuthLoading,
    currentUser,
  } = useAuthSession();
  const user = useUser();
  const isUserLoading = useIsUserLoading();
  const fetchCurrentUser = useFetchCurrentUser();
  const resetCoinStore = useResetCoinStore();

  useEffect(() => {
    if (!isAuthenticated) {
      resetCoinStore();
    }
  }, [isAuthenticated, resetCoinStore]);

  useEffect(() => {
    useUserStore.persist.rehydrate();
  }, []);

  const lastSeenUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUserId = user?.userId ?? null;
    const lastSeen = lastSeenUserIdRef.current;

    if (lastSeen === currentUserId) return;

    lastSeenUserIdRef.current = currentUserId;
    // Only invalidate queries on real session transitions (logout or account switch).
    // Initial hydration (null -> userId) MUST NOT nuke all active queries on mount.
    if (lastSeen !== null) {
      try {
        void getQueryClient().invalidateQueries();
      } catch {
        // Fail-open
      }
    }
  }, [user?.userId]);

  const attemptRef = useRef<{ count: number; lastErrorAt: number | null }>({
    count: 0,
    lastErrorAt: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
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
    //   - `isAuthenticated` flipping true/false (login, logout)
    //   - `pathname` changing (route navigation — fresh attempt budget)
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCurrentUser, isAuthenticated, isUserLoading, pathname]);

  useEffect(() => {
    const isProtected = isProtectedRoute(pathname);
    const hasToken = !!getAuthToken();

    if (isProtected && !isAuthLoading && !isAuthenticated && !currentUser && !hasToken) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [isAuthLoading, isAuthenticated, currentUser, pathname, router]);

  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  if (!isShellRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip pt-16">
        <AppHeader />
        <AppBreadcrumbs />
        <div
          id="main-content"
          tabIndex={-1}
          className="pt-1 md:pt-2 min-w-0 w-full overflow-x-clip max-w-full app-page-transition outline-none"
        >
          {children}
        </div>
      </SidebarInset>

      <QuickSearch />
      <ShortcutsHelpModal />
      <CoinBalanceSyncLayer />
      <RewardToast />
    </SidebarProvider>
  );
}
