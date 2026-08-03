"use client";

import { useCallback, useEffect, memo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  AccountSettings,
  NotificationSettings,
  PrivacySettings,
  LanguageSettings,
  ConnectedAccounts,
  DangerZone,
} from "@/features/users/components/settings";
import { useMyProfile } from "@/features/users/hooks/useMyProfile";
import { useLogoutAll } from "@/features/auth/hooks/use-logout-all";
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account";
import { DeleteAccountModal } from "@/features/auth/components/delete-account-modal";
import { runDeletionFinalization } from "@/features/auth/lifecycle/deletion-finalization";
import { buildDeletionReplaceHistory } from "@/features/auth/lifecycle/deletion-history";
import { DELETION_PUBLIC_LANDING_PATH } from "@/features/auth/lifecycle/deletion-history";
import { User, Bell, Shield, Globe, Link2, AlertTriangle } from "lucide-react";

const settingsTabs: {
  id: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "account",
    label: "Account",
    icon: <User className="w-5 h-5" aria-hidden="true" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="w-5 h-5" aria-hidden="true" />,
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: <Shield className="w-5 h-5" aria-hidden="true" />,
  },
  {
    id: "language",
    label: "Language & Region",
    icon: <Globe className="w-5 h-5" aria-hidden="true" />,
  },
  {
    id: "connections",
    label: "Connected Accounts",
    icon: <Link2 className="w-5 h-5" aria-hidden="true" />,
  },
  {
    id: "danger",
    label: "Danger Zone",
    icon: <AlertTriangle className="w-5 h-5" aria-hidden="true" />,
  },
];

/**
 * `SettingsPage` — the settings page, rewritten to use the API.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source batch:  Batch E (TKT-4.3.E1).
 *
 * ## Diff from the previous version
 *
 * The old page managed `settings` via `useLocalStorage` and passed them down
 * via `settings` + `onUpdate` props. This version:
 *
 *   - Reads `profile` from `useMyProfile()` (which wraps the Zustand user store
 *     and subscribes to `profile/updated` cross-tab events).
 *   - Passes `profile` to each settings section.
 *   - Each section owns its own mutation via `useUpdateMySettings` /
 *     `useUpdateMyProfile`.
 *   - The page only orchestrates: `useLogoutAll`, `useDeleteAccount`,
 *     and the `DeleteAccountModal`.
 */
const SettingsPage = memo(function SettingsPage() {
  const { profile, isHydrated } = useMyProfile();
  const logoutAll = useLogoutAll();

  // ── Deletion flow (unchanged — Epic 2.10) ─────────────────────────────

  const router = useRouter();
  const deletion = useDeleteAccount({
    finalize: async () => {
      const result = await runDeletionFinalization({
        replaceHistory: buildDeletionReplaceHistory(),
      });
      return { alreadyFinalized: result.alreadyFinalized };
    },
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Route away once deletion completes.
  useEffect(() => {
    if (deletion.state.kind === "completed") {
      router.replace(DELETION_PUBLIC_LANDING_PATH);
    }
  }, [deletion.state.kind, router]);

  // Open the deletion modal.
  const handleOpenDeleteAccount = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  // Trigger logout-all sessions.
  const handleSignOutAll = useCallback(() => {
    void logoutAll.logoutAll({ confirmed: true });
  }, [logoutAll]);

  const isDeleteTerminal =
    deletion.state.kind === "cleanup" ||
    deletion.state.kind === "completed";

  // ── Loading / unauthenticated state ────────────────────────────────────

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-transparent text-foreground mt-20">
        <header className="text-center px-4 mb-8">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
        </header>
        <div className="px-4 pb-12">
          <div className="animate-pulse space-y-6">
            <div className="h-48 rounded-lg bg-muted" />
            <div className="h-32 rounded-lg bg-muted" />
            <div className="h-48 rounded-lg bg-muted" />
          </div>
        </div>
      </main>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-transparent text-foreground mt-20">
      {/* Header */}
      <header className="text-center px-4 mb-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p className="text-foreground/70 text-base max-w-2xl mx-auto">
          Manage your account settings and preferences
        </p>
      </header>

      {/* Main Content */}
      <div className="px-4 pb-12">
        <Tabs
          defaultValue="account"
          className="grid grid-cols-1 lg:grid-cols-4 gap-8"
        >
          {/* Sidebar Navigation */}
          <TabsList
            aria-orientation="vertical"
            className="h-auto flex flex-row lg:flex-col w-full lg:w-auto bg-transparent border border-border rounded-lg p-3 justify-start lg:justify-start"
          >
            {settingsTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="w-full lg:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left data-[state=active]:bg-brand data-[state=active]:text-white text-foreground hover:bg-muted transition-colors justify-start"
              >
                {tab.icon}
                <span className="text-sm">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <ScrollArea className="h-full">
              <div className="p-1">
                <TabsContent value="account">
                  <AccountSettings profile={profile} />
                </TabsContent>
                <TabsContent value="notifications">
                  <NotificationSettings profile={profile} />
                </TabsContent>
                <TabsContent value="privacy">
                  <PrivacySettings profile={profile} />
                </TabsContent>
                <TabsContent value="language">
                  <LanguageSettings profile={profile} />
                </TabsContent>
                <TabsContent value="connections">
                  <ConnectedAccounts profile={profile} />
                </TabsContent>
                <TabsContent value="danger">
                  <DangerZone
                    onDeleteAccount={handleOpenDeleteAccount}
                    onExportData={() => {
                      // Export user data as JSON. In the future this could
                      // call a dedicated export API; for now, export the
                      // profile as a downloadable JSON file.
                      const dataStr = JSON.stringify(profile, null, 2);
                      const dataBlob = new Blob([dataStr], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "quiz-app-data.json";
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    onSignOutAll={handleSignOutAll}
                    isSignOutAllPending={logoutAll.status === 'pending'}
                    isDeleteAccountPending={isDeleteTerminal}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* Deletion modal — T18 */}
      <DeleteAccountModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        hook={deletion}
      />
    </main>
  );
});

export default SettingsPage;
