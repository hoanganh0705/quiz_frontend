"use client";

import { Suspense } from "react";

import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";
import { RecoveryEmailView } from "@/features/auth/components/recovery-email-view";
import {
  COPY_KEYS,
  resolveCopy,
  resolveCooldown,
} from "@/features/auth/copy/recovery-copy";
import { useForgotPassword } from "@/features/auth/forms/use-forgot-password";

const TEST_IDS = {
  page: "forgot-password-page",
  help: "forgot-help",
  form: "forgot-form",
  submit: "forgot-submit",
  acknowledgementBody: "forgot-acknowledgement-body",
  cooldown: "forgot-cooldown",
  error: "forgot-error",
} as const;

function ForgotPasswordInner() {
  const { state, cooldownRemainingMs, start } = useForgotPassword();

  const isPending = state.status === "pending";
  const isCooldown = state.status === "cooldown";
  const isError = state.status === "error";

  const showAcknowledgement =
    isCooldown || (isError && state.errorKind === "acknowledgement");

  const errorCopy =
    isError && state.errorKind !== "acknowledgement"
      ? state.errorKind === "rate_limited"
        ? resolveCopy(COPY_KEYS.forgot.error.rate_limited)
        : resolveCopy(COPY_KEYS.forgot.error.server)
      : null;

  const cooldownSeconds = isCooldown
    ? Math.ceil(cooldownRemainingMs / 1000)
    : 0;

  return (
    <RecoveryEmailView
      testIds={TEST_IDS}
      copy={{
        idleTitle: "Forgot password",
        idleHelp: resolveCopy(COPY_KEYS.forgot.idle.help),
        placeholder: resolveCopy(COPY_KEYS.forgot.idle.placeholder),
        submitLabel: "Send reset link",
        loadingLabel: resolveCopy(COPY_KEYS.forgot.loading),
        acknowledgementTitle: resolveCopy(
          COPY_KEYS.forgot.acknowledgement.title,
        ),
        acknowledgementBody: resolveCopy(COPY_KEYS.forgot.acknowledgement.body),
        cooldownLabel: resolveCooldown(cooldownSeconds),
      }}
      isPending={isPending}
      isCooldown={isCooldown}
      showAcknowledgement={showAcknowledgement}
      cooldownRemainingMs={cooldownRemainingMs}
      errorCopy={errorCopy}
      errorKind={state.status === "error" ? state.errorKind : "none"}
      onSubmitEmail={(email) => void start(email)}
    />
  );
}

export function ForgotPasswordPageView() {
  return (
    <Suspense
      fallback={<AuthCardSkeleton testId="forgot-password-skeleton" rows={1} />}
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
