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
import { useLocalStorage } from "@/shared/hooks/use-local-storage";
import { UserSettings, UserSettingsTabId } from "@/features/users/types";
import { defaultSettings } from "@/features/users/constants/settings";
import { User, Bell, Shield, Globe, Link2, AlertTriangle } from "lucide-react";
import { useLogoutAll } from "@/features/auth/hooks/use-logout-all";
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account";
import { DeleteAccountModal } from "@/features/auth/components/delete-account-modal";
import { runDeletionFinalization } from "@/features/auth/lifecycle/deletion-finalization";
import { buildDeletionReplaceHistory } from "@/features/auth/lifecycle/deletion-history";
import { DELETION_PUBLIC_LANDING_PATH } from "@/features/auth/lifecycle/deletion-history";

const settingsTabs: {
  id: UserSettingsTabId;
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

const SettingsPage = memo(function SettingsPage() {
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    "user_settings",
    defaultSettings,
  );

  const logoutAll = useLogoutAll();

  // T18: real destructive-deletion flow. The hook owns the request
  // lifecycle; the modal owns the UI. We inject `finalize` so the
  // coordinator runs history replacement (T20) before navigation.
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

  // T18: route away once the hook transitions to `completed`. The
  // modal hides the close X during cleanup/completed so the user
  // cannot dismiss; the page also refuses to render protected
  // content via the DeletionGuard pattern (see Epic 2.10 T21).
  useEffect(() => {
    if (deletion.state.kind === "completed") {
      router.replace(DELETION_PUBLIC_LANDING_PATH);
    }
  }, [deletion.state.kind, router]);

  const handleUpdateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      setSettings((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [setSettings],
  );

  // T18: the trigger only opens the modal. The actual delete request
  // is fired from inside the modal via `deletion.submit()`.
  const handleOpenDeleteAccount = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleExportData = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quiz-app-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  // T21: replace the placeholder `alert()` with the real
  // `useLogoutAll()` flow. The hook owns the confirmation
  // discipline (T20) and the service owns the finalization
  // (T6). When the modal's "Sign Out All" button fires
  // `onSignOutAll`, we forward to the hook with `confirmed: true`
  // because the modal UX already implies confirmation.
  const handleSignOutAll = useCallback(() => {
    void logoutAll.logoutAll({ confirmed: true });
  }, [logoutAll]);

  const isDeleteTerminal =
    deletion.state.kind === "cleanup" ||
    deletion.state.kind === "completed";

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
                  <AccountSettings
                    settings={settings}
                    onUpdate={handleUpdateSettings}
                  />
                </TabsContent>
                <TabsContent value="notifications">
                  <NotificationSettings
                    settings={settings}
                    onUpdate={handleUpdateSettings}
                  />
                </TabsContent>
                <TabsContent value="privacy">
                  <PrivacySettings
                    settings={settings}
                    onUpdate={handleUpdateSettings}
                  />
                </TabsContent>
                <TabsContent value="language">
                  <LanguageSettings
                    settings={settings}
                    onUpdate={handleUpdateSettings}
                  />
                </TabsContent>
                <TabsContent value="connections">
                  <ConnectedAccounts
                    settings={settings}
                    onUpdate={handleUpdateSettings}
                  />
                </TabsContent>
                <TabsContent value="danger">
                  <DangerZone
                    onDeleteAccount={handleOpenDeleteAccount}
                    onExportData={handleExportData}
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

      {/* T18: destructive-deletion modal owned by the settings page,
          driven by the trigger on the DangerZone card. */}
      <DeleteAccountModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        hook={deletion}
      />
    </main>
  );
});

export default SettingsPage;
