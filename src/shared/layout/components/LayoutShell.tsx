"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { AppSidebar } from "@/shared/layout/components/AppSidebar";
import { AppHeader } from "@/shared/layout/components/AppHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { QuickSearch } from "@/shared/ui";
import { ShortcutsHelpModal } from "@/shared/ui";
import { AppBreadcrumbs } from "@/shared/layout/components/AppBreadcrumbs";
import { useAuthState } from "@/features/auth/hooks";
import {
  useUser,
  useIsUserLoading,
  useFetchCurrentUser,
  useUserStore,
} from "@/features/users/store/user-store";

// Pages that render inside the full sidebar + header shell
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

// Pages that should be treated as shell pages ONLY when the pathname is
// an exact match (i.e. not a `startsWith` prefix). The home page is the
// only such route today — it lives at `/`, and adding `"/"` to
// `SHELL_PREFIXES` would make every page a shell page because every
// pathname `startsWith("/")`.
//
// Routes added here MUST be exact-matched; do not add nested paths.
const SHELL_EXACT_PATHS = ["/"] as const;

// Pages that show no shell at all (full-page auth screens)
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
  const { isAuthenticated } = useAuthState();
  const user = useUser();
  const isUserLoading = useIsUserLoading();
  const fetchCurrentUser = useFetchCurrentUser();

  // Rehydrate persist store from localStorage on client mount.
  useEffect(() => {
    useUserStore.persist.rehydrate();
  }, []);

  // ── Guard against the /users/me request loop ────────────────────────────────
  //
  // Bug history: `useEffect(() => { fetchCurrentUser() }, [...])` combined
  // with a Zustand `fetchCurrentUser` action that resets `isLoading: false`
  // on error created a tight loop:
  //
  //   render → effect fires → fetch fails → set({ isLoading: false })
  //   → render → effect fires → fetch fails → set({ isLoading: false }) …
  //
  // The fix has two parts:
  //
  //   1. The store action (`fetchCurrentUser`) now keeps an `inFlight`
  //      promise and returns the same promise on repeated calls. Combined
  //      with an `error` reset on every new attempt, this prevents the
  //      action from starting duplicate concurrent fetches.
  //
  //   2. This effect tracks an attempt counter (`attemptRef`) and refuses
  //      to re-fire for the same mount within a short window unless an
  //      EXTERNAL dependency changes (auth state flip, user cleared).
  //      The counter is keyed off `isAuthenticated` and `pathname`, not
  //      the `user` reference, so a Zustand-internal re-render with the
  //      same `user` cannot retrigger the fetch.
  //
  // Together: even if the fetch errors out, the effect will not loop.
  // Recovery requires either (i) the user logging in/out, (ii) a route
  // change, or (iii) an explicit `useMyProfile().refetch()` call from
  // a feature component.
  const attemptRef = useRef<{ count: number; lastErrorAt: number | null }>({
    count: 0,
    lastErrorAt: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset the counter on logout so a future login starts fresh.
      attemptRef.current = { count: 0, lastErrorAt: null };
      return;
    }
    if (user) return; // already hydrated — nothing to do
    if (isUserLoading) return; // a fetch is already in flight

    // If the last attempt errored less than 30s ago, do not retry from
    // the layout shell. A feature component (`useMyProfile`, profile
    // editor, etc.) can still issue an explicit `refetch()` to recover.
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

  // Client-side fallback guard: if we somehow reach a protected page without auth
  // (e.g. page loaded before middleware ran), redirect immediately.
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
    if (isProtected && isAuthenticated === false) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [isAuthenticated, pathname, router]);

  // Auth pages render without the shell
  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  // Non-shell pages (e.g. standalone marketing pages) also skip the shell
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
    </SidebarProvider>
  );
}
