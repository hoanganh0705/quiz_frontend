"use client";

import { Suspense } from "react";

import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";
import { RecoveryEmailView } from "@/features/auth/components/recovery-email-view";
import {
  COPY_KEYS,
  resolveCopy,
  resolveCooldown,
} from "@/features/auth/copy/verify-email-copy";
import { useResendVerification } from "@/features/auth/forms/use-resend-verification";

const TEST_IDS = {
  page: "resend-verification-page",
  help: "resend-help",
  form: "resend-form",
  submit: "resend-submit",
  acknowledgementBody: "resend-acknowledgement-body",
  cooldown: "resend-cooldown",
  error: "resend-error",
} as const;

function ResendVerificationInner() {
  const { state, start } = useResendVerification();

  const isPending = state.status === "pending";
  const isCooldown = state.status === "cooldown";
  const isError = state.status === "error";

  const errorCopy = isError
    ? state.errorKind === "rate_limited"
      ? resolveCopy(COPY_KEYS.resend.error.rate_limited)
      : resolveCopy(COPY_KEYS.resend.error.server)
    : null;

  const cooldownRemainingMs = isCooldown ? state.cooldownRemainingMs : 0;
  const cooldownSeconds = isCooldown
    ? Math.ceil(cooldownRemainingMs / 1000)
    : 0;

  return (
    <RecoveryEmailView
      testIds={TEST_IDS}
      copy={{
        idleTitle: "Resend verification",
        idleHelp: resolveCopy(COPY_KEYS.resend.idle.help),
        placeholder: resolveCopy(COPY_KEYS.resend.idle.placeholder),
        submitLabel: "Send verification email",
        loadingLabel: resolveCopy(COPY_KEYS.resend.loading),
        acknowledgementTitle: resolveCopy(
          COPY_KEYS.resend.acknowledgement.title,
        ),
        acknowledgementBody: resolveCopy(COPY_KEYS.resend.acknowledgement.body),
        cooldownLabel: resolveCooldown(cooldownSeconds),
      }}
      isPending={isPending}
      isCooldown={isCooldown}
      showAcknowledgement={isCooldown}
      cooldownRemainingMs={cooldownRemainingMs}
      errorCopy={errorCopy}
      errorKind={state.status === "error" ? state.errorKind : "none"}
      onSubmitEmail={(email) => void start({ email })}
    />
  );
}

export function ResendVerificationPageView() {
  return (
    <Suspense
      fallback={
        <AuthCardSkeleton testId="resend-verification-skeleton" rows={1} />
      }
    >
      <ResendVerificationInner />
    </Suspense>
  );
}
