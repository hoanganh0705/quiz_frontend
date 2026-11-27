"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeft, Lock } from "lucide-react";

import { ChangePasswordCard } from "@/features/auth/components/change-password-card";
import { SecuritySummaryCard } from "@/features/auth/components/security-summary-card";
import { SessionList } from "@/features/auth/components/session-list";
import { VerifyPasswordModal } from "@/features/auth/components/verify-password-modal";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/security-copy";
import { useActiveSessions } from "@/features/auth/hooks/use-active-sessions";
import { defaultChangePasswordDeps } from "@/features/auth/hooks/use-change-password";
import { useRevokeOtherSessions } from "@/features/auth/hooks/use-revoke-other-sessions";
import { useSecurityDashboard } from "@/features/auth/hooks/use-security-dashboard";
import {
  COPY_KEYS as PASSWORD_COPY_KEYS,
  resolveCopy as resolvePasswordCopy,
} from "@/features/auth/copy/password-copy";
import {
  isRecentlyVerified,
  markRecentlyVerified,
} from "@/features/auth/utils/verification-flag";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

import type { AccountSecurityDto, SessionListResponseDto } from "@/lib/api";

const CHANGE_PASSWORD_ACTION_ID = "change-password";

function useVerifiedFlagState(actionId: string, tick: number): boolean {
  const [verified, setVerified] = useState<boolean>(() =>
    isRecentlyVerified(actionId),
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setVerified(isRecentlyVerified(actionId));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [actionId, tick]);

  useEffect(() => {
    const id = setInterval(() => {
      setVerified(isRecentlyVerified(actionId));
    }, 1000);
    return () => clearInterval(id);
  }, [actionId]);

  return verified;
}

export default function SecuritySettingsPage() {
  const dashboard = useSecurityDashboard();
  const sessions = useActiveSessions();

  const others = useRevokeOtherSessions({
    listOps: { revalidate: sessions.revalidate },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifiedTick, setVerifiedTick] = useState(0);
  const isVerified = useVerifiedFlagState(
    CHANGE_PASSWORD_ACTION_ID,
    verifiedTick,
  );
  const [isCardMounted, setIsCardMounted] = useState(false);

  const handleOpenVerifyModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseVerifyModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleVerified = useCallback(() => {
    markRecentlyVerified(CHANGE_PASSWORD_ACTION_ID);
    setIsModalOpen(false);
    setVerifiedTick((t) => t + 1);
  }, []);

  const handleCollapseAfterSuccess = useCallback(() => {
    setIsCardMounted(false);
  }, []);

  useEffect(() => {
    if (isVerified) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsCardMounted(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isVerified]);

  const revalidateDashboard = useCallback(
    (next: AccountSecurityDto) => {
      void next;
      void dashboard.refetch();
    },
    [dashboard],
  );

  const revalidateSessions = useCallback(
    (next: SessionListResponseDto) => {
      sessions.mutate(() => next.sessions);
    },
    [sessions],
  );

  const hookDeps = useMemo(
    () => ({
      ...defaultChangePasswordDeps,
      revalidateDashboard,
      revalidateSessions,
    }),
    [revalidateDashboard, revalidateSessions],
  );

  const handleOpenRevokeOthers = useCallback(() => {
    void others.revokeOthers({ confirmed: false });
  }, [others]);

  const handleConfirmRevokeOthers = useCallback(async () => {
    await others.revokeOthers({ confirmed: true });
  }, [others]);

  const handleCancelRevokeOthers = useCallback(() => {
    others.cancelConfirmation();
  }, [others]);

  const isBusy =
    dashboard.status === "loading" ||
    sessions.status === "loading" ||
    others.status === "pending" ||
    isModalOpen;

  const showChangePasswordCta = !isVerified && !isCardMounted;

  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-8")}
      aria-busy={isBusy}
      data-testid="security-settings-page"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {resolveCopy(COPY_KEYS.dashboard.title)}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            {resolveCopy(COPY_KEYS.dashboard.subtitle)}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-10 sm:h-9 gap-2 self-start sm:self-auto shrink-0"
        >
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Settings
          </Link>
        </Button>
      </header>

      <section
        aria-label={resolveCopy(COPY_KEYS.dashboard.title)}
        data-testid="security-dashboard-slot"
      >
        <SecuritySummaryCard
          data={dashboard.data}
          status={dashboard.status}
          error={dashboard.error}
          refetch={dashboard.refetch}
        />
      </section>

      {showChangePasswordCta && (
        <section
          aria-label={resolvePasswordCopy(
            PASSWORD_COPY_KEYS.password.changePassword.title,
          )}
          data-testid="change-password-cta-slot"
        >
          <Button
            type="button"
            variant="default"
            onClick={handleOpenVerifyModal}
            className="h-10 sm:h-9 gap-2 bg-default text-default-foreground hover:bg-default-hover"
            data-testid="change-password-cta"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {resolvePasswordCopy(
              PASSWORD_COPY_KEYS.password.changePassword.title,
            )}
          </Button>
        </section>
      )}

      {isCardMounted && (
        <section
          aria-label={resolvePasswordCopy(
            PASSWORD_COPY_KEYS.password.changePassword.title,
          )}
          data-testid="change-password-slot"
        >
          <ChangePasswordCard
            hookDeps={hookDeps}
            onCollapseAfterSuccess={handleCollapseAfterSuccess}
          />
        </section>
      )}

      <section
        aria-label={resolveCopy(COPY_KEYS.sessionList.title)}
        data-testid="security-sessions-slot"
      >
        <SessionList
          sessions={sessions.sessions}
          status={sessions.status}
          error={sessions.error}
          onRevalidate={sessions.revalidate}
          listOps={{
            mutate: sessions.mutate,
            revalidate: sessions.revalidate,
          }}
          onRevokeOthers={handleOpenRevokeOthers}
          revokeOthersPending={others.status === "pending"}
        />
      </section>

      <RevokeOthersConfirmDialog
        open={others.requiresConfirmation && others.status !== "pending"}
        onConfirm={handleConfirmRevokeOthers}
        onCancel={handleCancelRevokeOthers}
      />

      <VerifyPasswordModal
        open={isModalOpen}
        onClose={handleCloseVerifyModal}
        onVerified={handleVerified}
      />
    </div>
  );
}

interface RevokeOthersConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function RevokeOthersConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: RevokeOthersConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent data-testid="revoke-others-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolveCopy(COPY_KEYS.revoke.others.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resolveCopy(COPY_KEYS.revoke.others.body)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="revoke-others-confirm-cancel">
            {resolveCopy(COPY_KEYS.revoke.others.cancel)}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void onConfirm();
            }}
            data-testid="revoke-others-confirm-action"
          >
            {resolveCopy(COPY_KEYS.revoke.others.confirm)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
