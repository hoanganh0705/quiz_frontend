"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { LOGIN_ROUTE } from "@/shared/config/routes";

import { AuthCardLayout } from "@/features/auth/components/auth-card-layout";
import {
  recoveryEmailSchema,
  type RecoveryEmailFormValues,
} from "@/features/auth/forms/schemas/recovery-email.schema";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface RecoveryEmailViewTestIds {
  page: string;
  help: string;
  form: string;
  submit: string;
  acknowledgementBody: string;
  cooldown: string;
  error: string;
}

export interface RecoveryEmailViewCopy {
  idleTitle: string;
  idleHelp: string;
  placeholder: string;
  submitLabel: string;
  loadingLabel: string;
  acknowledgementTitle: string;
  acknowledgementBody: string;
  cooldownLabel: string;
}

export interface RecoveryEmailViewProps {
  testIds: RecoveryEmailViewTestIds;
  copy: RecoveryEmailViewCopy;
  isPending: boolean;
  isCooldown: boolean;
  showAcknowledgement: boolean;
  cooldownRemainingMs: number;
  errorCopy: string | null;
  errorKind: string;
  onSubmitEmail: (email: string) => void;
}

export function RecoveryEmailView({
  testIds,
  copy,
  isPending,
  isCooldown,
  showAcknowledgement,
  cooldownRemainingMs,
  errorCopy,
  errorKind,
  onSubmitEmail,
}: RecoveryEmailViewProps) {
  const searchParams = useSearchParams();
  const defaultEmail = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RecoveryEmailFormValues>({
    resolver: zodResolver(recoveryEmailSchema),
    defaultValues: { email: defaultEmail },
  });

  const emailValue = watch("email");
  const submitDisabled = isPending || isCooldown || !emailValue;

  return (
    <AuthCardLayout testId={testIds.page}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {showAcknowledgement ? copy.acknowledgementTitle : copy.idleTitle}
        </h1>
        <p className="text-sm text-muted-foreground" data-testid={testIds.help}>
          {showAcknowledgement ? copy.acknowledgementBody : copy.idleHelp}
        </p>
      </div>

      {!showAcknowledgement && (
        <form
          onSubmit={handleSubmit((values) => onSubmitEmail(values.email))}
          className="space-y-4"
          data-testid={testIds.form}
        >
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={copy.placeholder}
              {...register("email")}
              aria-invalid={!!errors.email}
              disabled={isPending || isCooldown}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitDisabled}
            className="w-full"
            data-testid={testIds.submit}
          >
            {isPending ? copy.loadingLabel : copy.submitLabel}
          </Button>
        </form>
      )}

      {showAcknowledgement && (
        <p
          className="text-xs text-muted-foreground"
          data-testid={testIds.acknowledgementBody}
          data-cooldown-remaining-ms={isCooldown ? cooldownRemainingMs : 0}
        >
          {copy.acknowledgementBody}
        </p>
      )}

      {isCooldown && (
        <p
          className="text-xs font-mono tabular-nums text-muted-foreground"
          data-testid={testIds.cooldown}
        >
          {copy.cooldownLabel}
        </p>
      )}

      {errorCopy && (
        <p
          className="text-xs text-destructive"
          data-testid={testIds.error}
          data-error-kind={errorKind}
        >
          {errorCopy}
        </p>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <Button asChild variant="outline">
          <Link href={LOGIN_ROUTE}>Back to login</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/signup">Create a new account</Link>
        </Button>
      </div>
    </AuthCardLayout>
  );
}
