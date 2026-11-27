"use client";

import { memo, useState } from "react";

import { Download, LogOut, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";

interface DangerZoneProps {
  onDeleteAccount: () => void;
  onExportData: () => void;
  onSignOutAll: () => void;
  isSignOutAllPending?: boolean;
  signOutAllError?: string | null;
  isDeleteAccountPending?: boolean;
}

export const DangerZone = memo(function DangerZone({
  onDeleteAccount,
  onExportData,
  onSignOutAll,
  isSignOutAllPending = false,
  signOutAllError = null,
  isDeleteAccountPending = false,
}: DangerZoneProps) {
  const [signOutAllDialogOpen, setSignOutAllDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground">
          Export a backup of your data or take irreversible account actions.
        </p>
      </div>

      {signOutAllError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {signOutAllError}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Export Your Data
          </h3>
          <p className="text-sm text-muted-foreground">
            Download a JSON copy of your profile and account settings.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 sm:h-9 gap-2 shrink-0 self-start sm:self-auto"
          onClick={onExportData}
          aria-label="Export your data"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Data
        </Button>
      </div>

      <Card className="bg-card border-destructive/40 rounded-xl gap-0 py-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-destructive/20 bg-destructive/5">
          <CardTitle>
            <h3 className="text-base font-semibold text-destructive">
              Irreversible Actions
            </h3>
          </CardTitle>
          <CardDescription>
            Sign out all active devices or permanently delete your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 divide-y divide-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-sm font-semibold text-foreground">
                Sign Out All Sessions
              </h4>
              <p className="text-sm text-muted-foreground">
                End your session on every browser and device currently signed
                in.
              </p>
            </div>
            <Dialog
              open={signOutAllDialogOpen}
              onOpenChange={(open) => {
                if (isSignOutAllPending && !open) return;
                setSignOutAllDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 sm:h-9 gap-2 shrink-0 self-start sm:self-auto border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                  aria-label="Sign out from all sessions"
                  disabled={isSignOutAllPending}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign Out All Sessions</DialogTitle>
                  <DialogDescription>
                    This will sign you out from all devices. You will need to
                    log in again on each device.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignOutAllDialogOpen(false)}
                    disabled={isSignOutAllPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onSignOutAll}
                    disabled={isSignOutAllPending}
                    aria-busy={isSignOutAllPending}
                  >
                    {isSignOutAllPending ? "Signing out…" : "Sign Out All"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-sm font-semibold text-destructive">
                Delete Account
              </h4>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account and all associated data. This
                cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="h-10 sm:h-9 gap-2 shrink-0 self-start sm:self-auto"
              onClick={onDeleteAccount}
              disabled={isDeleteAccountPending}
              aria-label="Delete your account permanently"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
