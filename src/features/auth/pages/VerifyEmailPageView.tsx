"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { LOGIN_ROUTE } from "@/shared/config/routes";

import {
  AuthCardLayout,
  AuthCardSkeleton,
} from "@/features/auth/components/auth-card-layout";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/verify-email-copy";
import { useVerifyEmailAutoRun } from "@/features/auth/forms/use-verify-email";

import { Button } from "@/components/ui/Button";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);

  const { state } = useVerifyEmailAutoRun(token);

  const isInvalid =
    state.status === "error" && state.errorKind === "invalid_link";
  const isPending = state.status === "pending" || state.status === "idle";

  const bodyCopy = isInvalid
    ? resolveCopy(COPY_KEYS.verify.invalid.body)
    : resolveCopy(COPY_KEYS.verify.acknowledgement.body);

  const titleCopy = isPending
    ? resolveCopy(COPY_KEYS.verify.loading.title)
    : resolveCopy(COPY_KEYS.verify.acknowledgement.title);

  const resendHref = email
    ? `/resend-verification?email=${encodeURIComponent(email)}`
    : "/resend-verification";

  return (
    <AuthCardLayout testId="verify-email-page">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{titleCopy}</h1>
        <p
          className="text-sm text-muted-foreground"
          data-testid="verify-acknowledgement-body"
          data-body-kind={isInvalid ? "invalid_link" : "acknowledgement"}
        >
          {bodyCopy}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild variant="outline">
          <Link href={resendHref} data-testid="verify-resend-link">
            {resolveCopy(COPY_KEYS.verify.invalid.resendLabel)}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={LOGIN_ROUTE} data-testid="verify-login-link">
            {resolveCopy(COPY_KEYS.verify.invalid.loginLabel)}
          </Link>
        </Button>
      </div>
    </AuthCardLayout>
  );
}

export function VerifyEmailPageView() {
  return (
    <Suspense
      fallback={<AuthCardSkeleton testId="verify-email-skeleton" rows={1} />}
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
