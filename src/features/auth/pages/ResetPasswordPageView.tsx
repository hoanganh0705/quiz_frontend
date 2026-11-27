"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { LOGIN_ROUTE } from "@/shared/config/routes";

import {
  AuthCardLayout,
  AuthCardSkeleton,
} from "@/features/auth/components/auth-card-layout";
import { PasswordInput } from "@/features/auth/components/password-input";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/recovery-copy";
import {
  resetPasswordSchema,
  tokenResetSchema,
  toResetPasswordDto,
  type ResetPasswordFormValues,
} from "@/features/auth/forms/schemas/reset-password.schema";
import { useResetPassword } from "@/features/auth/forms/use-reset-password";

import { Button } from "@/components/ui/Button";

function isWellFormedResetToken(token: string | null): boolean {
  if (!token) return false;
  return tokenResetSchema.safeParse(token).success;
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token"), [searchParams]);

  const tokenIsValid = useMemo(
    () => isWellFormedResetToken(tokenFromUrl),
    [tokenFromUrl],
  );

  const { state, run } = useResetPassword();

  const isPending = state.status === "pending";
  const isError = state.status === "error";
  const isSuccess = state.status === "success";
  const isInvalidLink =
    !tokenIsValid || (isError && state.errorKind === "invalid_link");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl ?? "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      router.replace(state.nextRoute);
    }
  }, [state, router]);

  return (
    <AuthCardLayout testId="reset-password-page">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {isSuccess
            ? resolveCopy(COPY_KEYS.reset.success.title)
            : isPending
              ? resolveCopy(COPY_KEYS.reset.loading.title)
              : isInvalidLink
                ? resolveCopy(COPY_KEYS.reset.invalid.title)
                : "Reset your password"}
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="reset-help">
          {isSuccess
            ? resolveCopy(COPY_KEYS.reset.success.body)
            : isPending
              ? resolveCopy(COPY_KEYS.reset.loading.body)
              : isInvalidLink
                ? resolveCopy(COPY_KEYS.reset.invalid.body)
                : "Enter the new password for your account."}
        </p>
      </div>

      {isInvalidLink && (
        <div
          className="rounded-md border border-border bg-muted/40 p-4 text-sm"
          data-testid="reset-invalid-body"
          data-token-present={tokenFromUrl ? "true" : "false"}
          data-token-valid={tokenIsValid ? "true" : "false"}
        >
          <p className="text-sm text-muted-foreground">
            {resolveCopy(COPY_KEYS.reset.invalid.body)}
          </p>
        </div>
      )}

      {!isInvalidLink && !isSuccess && (
        <form
          onSubmit={handleSubmit(async (values) => {
            const dto = toResetPasswordDto(values);
            await run(dto);
          })}
          className="space-y-4"
          data-testid="reset-form"
        >
          <input type="hidden" {...register("token")} />

          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-sm font-medium text-foreground"
            >
              New password
            </label>
            <PasswordInput
              id="newPassword"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register("newPassword")}
              aria-invalid={!!errors.newPassword}
              disabled={isPending}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="newPasswordConfirmation"
              className="text-sm font-medium text-foreground"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="newPasswordConfirmation"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              {...register("newPasswordConfirmation")}
              aria-invalid={!!errors.newPasswordConfirmation}
              disabled={isPending}
            />
            {errors.newPasswordConfirmation && (
              <p className="text-xs text-destructive">
                {errors.newPasswordConfirmation.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            data-testid="reset-submit"
          >
            {isPending
              ? resolveCopy(COPY_KEYS.reset.loading.title)
              : "Update password"}
          </Button>
        </form>
      )}

      {isSuccess && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="reset-success-body"
        >
          {resolveCopy(COPY_KEYS.reset.success.body)}
        </p>
      )}

      {isError && state.errorKind !== "invalid_link" && (
        <p
          className="text-xs text-destructive"
          data-testid="reset-error"
          data-error-kind={state.errorKind}
        >
          {state.errorKind === "validation"
            ? resolveCopy(COPY_KEYS.reset.error.validation)
            : state.errorKind === "rate_limited"
              ? resolveCopy(COPY_KEYS.reset.error.rate_limited)
              : resolveCopy(COPY_KEYS.reset.error.server)}
        </p>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <Button asChild variant="outline">
          <Link href="/forgot-password">
            {resolveCopy(COPY_KEYS.reset.invalid.forgotLabel)}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={LOGIN_ROUTE}>
            {resolveCopy(COPY_KEYS.reset.invalid.loginLabel)}
          </Link>
        </Button>
      </div>
    </AuthCardLayout>
  );
}

export function ResetPasswordPageView() {
  return (
    <Suspense
      fallback={<AuthCardSkeleton testId="reset-password-skeleton" rows={3} />}
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
