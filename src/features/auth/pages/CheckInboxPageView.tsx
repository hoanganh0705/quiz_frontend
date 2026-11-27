import Link from "next/link";

import { LOGIN_ROUTE } from "@/shared/config/routes";

import { AuthCardLayout } from "@/features/auth/components/auth-card-layout";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/registration-copy";

export function CheckInboxPageView() {
  return (
    <AuthCardLayout testId="check-inbox-page" className="text-center">
      <h1 className="text-3xl font-bold text-foreground">
        {resolveCopy(COPY_KEYS.submit.acknowledgement.title)}
      </h1>
      <p
        className="text-sm text-muted-foreground"
        data-testid="acknowledgement-body"
      >
        {resolveCopy(COPY_KEYS.submit.acknowledgement.body)}
      </p>
      <p className="text-sm text-muted-foreground">
        {resolveCopy(COPY_KEYS.submit.acknowledgement.action)}
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Link
          href="/resend-verification"
          className="text-sm font-medium underline text-foreground hover:text-muted-foreground"
          data-testid="resend-link"
        >
          {resolveCopy(COPY_KEYS.submit.acknowledgement.resendLabel)}
        </Link>
        <Link
          href={LOGIN_ROUTE}
          className="text-sm font-medium underline text-foreground hover:text-muted-foreground"
          data-testid="login-link"
        >
          {resolveCopy(COPY_KEYS.submit.acknowledgement.loginLabel)}
        </Link>
      </div>
    </AuthCardLayout>
  );
}
