"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  LEGAL_ROUTES,
  resolveSafeRedirectPath,
} from "@/shared/config/routes";

import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { LoginSkeleton } from "@/features/auth/components/login-skeleton";
import { PasswordInput } from "@/features/auth/components/password-input";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/login-copy";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/forms/schemas/login.schema";
import { useGoogleLogin } from "@/features/auth/forms/use-google-login";
import { useLogin } from "@/features/auth/forms/use-login";
import { useFetchCurrentUser } from "@/features/users/store/user-store";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type { GoogleLoginErrorKind } from "@/features/auth/errors/oauth-error-mapper";

function RenderOAuthError({ errorKind }: { errorKind: GoogleLoginErrorKind }) {
  switch (errorKind) {
    case "invalid_token":
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.google.invalidToken.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.google.invalidToken.body)}
          </p>
        </>
      );
    case "account_conflict":
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.google.accountConflict.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.google.accountConflict.body)}
          </p>
        </>
      );
    case "linking_required":
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.google.linkingRequired.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.google.linkingRequired.body)}
          </p>
        </>
      );
    case "retryable":
    default:
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.google.retryable.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.google.retryable.body)}
          </p>
        </>
      );
  }
}

function RenderCredentialError({
  errorKind,
}: {
  errorKind: "invalid_credentials" | "rate_limited" | "validation" | "server";
}) {
  switch (errorKind) {
    case "invalid_credentials":
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.invalidCredentials.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.invalidCredentials.body)}
          </p>
        </>
      );
    case "rate_limited":
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.rateLimited.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.rateLimited.body)}
          </p>
        </>
      );
    case "server":
    case "validation":
    default:
      return (
        <>
          <p className="font-medium">
            {resolveCopy(COPY_KEYS.error.server.title)}
          </p>
          <p className="mt-1 opacity-80">
            {resolveCopy(COPY_KEYS.error.server.body)}
          </p>
        </>
      );
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchCurrentUser = useFetchCurrentUser();
  const { state, start, reset } = useLogin();
  const {
    state: googleState,
    isAvailable,
    start: startGoogle,
    reset: resetGoogle,
  } = useGoogleLogin();

  const redirectTo = useMemo(
    () => resolveSafeRedirectPath(searchParams.get("redirect"), "/quizzes"),
    [searchParams],
  );

  const isPending = state.status === "pending";
  const isGooglePending =
    googleState.status === "provider_initializing" ||
    googleState.status === "provider_pending" ||
    googleState.status === "exchange_pending";

  const errorKind = state.status === "error" ? state.errorKind : null;
  const googleErrorKind =
    googleState.status === "error" ? googleState.errorKind : null;

  const handleGoogleSignIn = async () => {
    reset();
    resetGoogle();
    const result = await startGoogle();
    if (result.kind === "success") {
      await fetchCurrentUser();
      router.replace(redirectTo);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    reset();
    const result = await start(values);
    if (result.kind === "success") {
      await fetchCurrentUser();
      router.replace(redirectTo);
    }
  });

  return (
    <AuthSplitLayout imageAlt="Login background" asideLabel="Login background">
      <header className="space-y-10">
        <h2 className="text-3xl font-bold text-foreground">
          {resolveCopy(COPY_KEYS.title)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {resolveCopy(COPY_KEYS.form.noAccount)}{" "}
          <Link
            href="/signup"
            className="text-foreground hover:text-muted-foreground font-semibold transition-colors underline"
          >
            {resolveCopy(COPY_KEYS.form.createAccount)}
          </Link>
        </p>
      </header>

      <section aria-label="Sign in to your account">
        {googleErrorKind && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4"
          >
            <RenderOAuthError errorKind={googleErrorKind} />
          </div>
        )}

        {errorKind && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4"
          >
            <RenderCredentialError errorKind={errorKind} />
          </div>
        )}

        <GoogleSignInButton
          isAvailable={isAvailable}
          disabled={isPending || isGooglePending}
          isLoading={googleState.status === "exchange_pending"}
          onClick={handleGoogleSignIn}
          className="w-full mb-4"
        />

        {isAvailable && (
          <div
            className="relative mb-4"
            role="presentation"
            aria-label="Or continue with email"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {resolveCopy(COPY_KEYS.form.orContinueWith)}
              </span>
            </div>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-5"
          aria-label="Sign in to your account"
        >
          <div className="space-y-2">
            <Label htmlFor="email">
              {resolveCopy(COPY_KEYS.form.email.label)}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={resolveCopy(COPY_KEYS.form.email.placeholder)}
              {...register("email")}
              className="h-12 text-primary"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isPending || isGooglePending}
              autoComplete="email"
            />
            {errors.email && (
              <p
                id="email-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {resolveCopy(COPY_KEYS.form.password.label)}
            </Label>
            <PasswordInput
              id="password"
              placeholder={resolveCopy(COPY_KEYS.form.password.placeholder)}
              {...register("password")}
              className="h-12 pr-12 text-primary"
              toggleClassName="right-4"
              revealLabel="Show password"
              hideLabel="Hide password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isPending || isGooglePending}
              autoComplete="current-password"
            />
            {errors.password && (
              <p
                id="password-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="remember"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="text-brand"
                    disabled={isPending || isGooglePending}
                  />
                )}
              />
              <Label
                htmlFor="remember"
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                {resolveCopy(COPY_KEYS.form.rememberMe)}
              </Label>
            </div>
            <Link
              href="/forgot-password"
              className="text-xs text-foreground hover:text-muted-foreground font-medium transition-colors underline"
            >
              {resolveCopy(COPY_KEYS.form.forgotPassword)}
            </Link>
          </div>

          <div className="text-xs text-muted-foreground">
            {resolveCopy(COPY_KEYS.form.needVerification)}{" "}
            <Link
              href="/resend-verification"
              className="text-foreground hover:text-muted-foreground font-medium transition-colors underline"
            >
              {resolveCopy(COPY_KEYS.form.resendLink)}
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isPending || isGooglePending}
            size="lg"
            className="w-full h-12 font-semibold rounded-xl"
          >
            {isPending ? (
              <div
                className="flex items-center gap-2"
                role="status"
                aria-label="Signing in, please wait"
              >
                <div
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                  aria-hidden="true"
                />
                {resolveCopy(COPY_KEYS.button.signingIn)}
              </div>
            ) : (
              <span>{resolveCopy(COPY_KEYS.button.signIn)}</span>
            )}
          </Button>
        </form>

        <footer className="text-xs text-center text-muted-foreground mt-8 leading-relaxed">
          {resolveCopy(COPY_KEYS.form.termsLabel)}{" "}
          <Link
            href={LEGAL_ROUTES.terms}
            className="text-foreground hover:text-muted-foreground transition-colors underline"
          >
            {resolveCopy(COPY_KEYS.form.terms)}
          </Link>{" "}
          {resolveCopy(COPY_KEYS.form.and)}{" "}
          <Link
            href={LEGAL_ROUTES.privacy}
            className="text-foreground hover:text-muted-foreground transition-colors underline"
          >
            {resolveCopy(COPY_KEYS.form.privacy)}
          </Link>
        </footer>
      </section>
    </AuthSplitLayout>
  );
}

export function LoginPageView() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
