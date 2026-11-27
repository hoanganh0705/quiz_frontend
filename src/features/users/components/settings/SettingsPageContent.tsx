"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";

import {
  AlertTriangle,
  Bell,
  Globe,
  Link2,
  RotateCw,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";

import { DeleteAccountModal } from "@/features/auth/components/delete-account-modal";
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account";
import { useLogoutAll } from "@/features/auth/hooks/use-logout-all";
import { runDeletionFinalization } from "@/features/auth/lifecycle/deletion-finalization";
import {
  DELETION_PUBLIC_LANDING_PATH,
  buildDeletionReplaceHistory,
} from "@/features/auth/lifecycle/deletion-history";
import { NotificationPreferencesForm } from "@/features/notifications/components";
import {
  AccountSettings,
  ConnectedAccounts,
  DangerZone,
  LanguageSettings,
  PrivacySettings,
} from "@/features/users/components/settings";
import { useMyProfile } from "@/features/users/hooks/useMyProfile";

import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

function SettingsLoadingSkeleton() {
  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-8")}
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

const settingsTabs: ReadonlyArray<{
  id: string;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "account",
    label: "Account",
    icon: <User className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: "language",
    label: "Language & Region",
    icon: <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: "connections",
    label: "Connected Accounts",
    icon: <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: "danger",
    label: "Danger Zone",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
];

const VALID_TAB_IDS = new Set(settingsTabs.map((tab) => tab.id));

function useIsDesktopTabs(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(min-width: 960px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

const SettingsPage = memo(function SettingsPage() {
  const { profile, isHydrated, isLoading, error, refetch } = useMyProfile();
  const logoutAll = useLogoutAll();
  const router = useRouter();
  const isDesktopTabs = useIsDesktopTabs();
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param && VALID_TAB_IDS.has(param)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setActiveTab(param);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  const handleTabChange = useCallback((nextTab: string) => {
    setActiveTab(nextTab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextTab === "account") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", nextTab);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const deletion = useDeleteAccount({
    finalize: async () => {
      const result = await runDeletionFinalization({
        replaceHistory: buildDeletionReplaceHistory(),
      });
      return { alreadyFinalized: result.alreadyFinalized };
    },
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (deletion.state.kind === "completed") {
      router.replace(DELETION_PUBLIC_LANDING_PATH);
    }
  }, [deletion.state.kind, router]);

  const handleOpenDeleteAccount = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleSignOutAll = useCallback(() => {
    void logoutAll.logoutAll({ confirmed: true });
  }, [logoutAll]);

  const handleExportData = useCallback(() => {
    const dataStr = JSON.stringify(profile, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quizhub-account-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [profile]);

  const isDeleteTerminal =
    deletion.state.kind === "cleanup" || deletion.state.kind === "completed";

  const signOutAllError =
    logoutAll.error === null
      ? null
      : logoutAll.error.cause instanceof Error
        ? logoutAll.error.cause.message
        : "Failed to sign out of all sessions. Please try again.";

  if (!isHydrated && !error) {
    return <SettingsLoadingSkeleton />;
  }

  if (!isHydrated && error) {
    return (
      <div
        className={cn(PAGE_CONTAINER_CLASS, "space-y-8")}
        data-testid="settings-page-error"
      >
        <header className="space-y-1.5 border-b border-border pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Manage your account profile, notifications, privacy, regional
            preferences, and security.
          </p>
        </header>

        <div
          className="max-w-xl rounded-xl border border-destructive/30 bg-card p-6 space-y-4 shadow-xs"
          role="alert"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Unable to load settings
            </h2>
            <p className="text-sm text-muted-foreground">
              {error || "We could not fetch your profile details right now."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-9 gap-2"
            disabled={isLoading}
            onClick={() => {
              void refetch();
            }}
          >
            <RotateCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-8")}
      data-testid="settings-page"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Manage your account profile, notifications, privacy, regional
            preferences, and security.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-10 sm:h-9 gap-2 self-start sm:self-auto shrink-0"
        >
          <Link href="/settings/security">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Security &amp; Sessions
          </Link>
        </Button>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation={isDesktopTabs ? "vertical" : "horizontal"}
        className="grid grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-8 items-start"
      >
        <TabsList
          aria-label="Settings sections"
          aria-orientation={isDesktopTabs ? "vertical" : "horizontal"}
          className="h-auto w-full grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col items-stretch gap-1 rounded-xl border border-border bg-card p-1.5 shadow-xs lg:sticky lg:top-24"
        >
          {settingsTabs.map((tab) => {
            const isDanger = tab.id === "danger";
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "w-full min-w-0 flex items-center justify-start gap-2.5 min-h-10 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:shadow-xs",
                  isDanger
                    ? "text-destructive/90 hover:bg-destructive/10 hover:text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-brand data-[state=active]:text-brand-foreground",
                )}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="min-w-0 w-full">
          <TabsContent value="account" className="mt-0">
            <AccountSettings profile={profile} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Notification Preferences
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose how and when you receive quiz invites, achievements, and
                activity updates.
              </p>
            </div>
            <NotificationPreferencesForm />
          </TabsContent>
          <TabsContent value="privacy" className="mt-0">
            <PrivacySettings profile={profile} />
          </TabsContent>
          <TabsContent value="language" className="mt-0">
            <LanguageSettings profile={profile} />
          </TabsContent>
          <TabsContent value="connections" className="mt-0">
            <ConnectedAccounts profile={profile} />
          </TabsContent>
          <TabsContent value="danger" className="mt-0">
            <DangerZone
              onDeleteAccount={handleOpenDeleteAccount}
              onExportData={handleExportData}
              onSignOutAll={handleSignOutAll}
              isSignOutAllPending={logoutAll.status === "pending"}
              signOutAllError={signOutAllError}
              isDeleteAccountPending={isDeleteTerminal}
            />
          </TabsContent>
        </div>
      </Tabs>

      <DeleteAccountModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        hook={deletion}
      />
    </div>
  );
});

export { SettingsPage as SettingsPageContent };
export default SettingsPage;
