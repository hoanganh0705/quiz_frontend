"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { LEGAL_ROUTES, LOGIN_ROUTE } from "@/shared/config/routes";

import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import {
  COPY_KEYS,
  registrationCopy,
  resolveCopy,
} from "@/features/auth/copy/registration-copy";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/forms/schemas/register.schema";
import { SignupAvailabilityStrip } from "@/features/auth/forms/signup-availability-strip";
import { useRegistrationSubmit } from "@/features/auth/forms/use-registration-submit";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function RegistrationFormBody() {
  const router = useRouter();
  const { state, start, reset } = useRegistrationSubmit();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      agreeToTerms: false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const passwordValue = watch("password");
  const emailValue = watch("email");
  const usernameValue = watch("username");

  useEffect(() => {
    if (state.status === "success") {
      router.replace(state.nextRoute);
    }
  }, [state, router]);

  useEffect(() => {
    if (state.status !== "error") return;
    const fieldErrors = state.result.fieldErrors;
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (typeof message !== "string") continue;
      const knownField = (["username", "email", "password"] as const).find(
        (key) => key === field,
      );
      if (!knownField) continue;
      setError(knownField, {
        type: "server",
        message,
      });
    }
  }, [state, setError]);

  const onSubmit = useCallback(
    (values: RegisterFormValues) => {
      void start(values);
    },
    [start],
  );

  useEffect(() => {
    if (state.status !== "error") return;
    const subscription = watch(() => reset());
    return () => subscription.unsubscribe();
  }, [state.status, watch, reset]);

  const submitDisabled =
    state.status === "pending" || state.status === "success";

  const globalCopyKey = ((): string => {
    if (state.status !== "error") return "";
    switch (state.result.errorKind) {
      case "validation":
        return COPY_KEYS.submit.error.validation;
      case "rate_limited":
        return COPY_KEYS.submit.error.rate_limited;
      case "server":
        return COPY_KEYS.submit.error.server;
      case "forbidden":
        return COPY_KEYS.submit.error.forbidden;
    }
  })();

  return (
    <AuthSplitLayout
      imageAlt="QuizHub signup - Join our community of quiz enthusiasts"
      asideLabel="Signup background"
      contentClassName="space-y-10"
    >
      {/* Header */}
      <div className="space-y-10">
        <h2 className="text-3xl font-bold text-foreground">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={LOGIN_ROUTE}
            className="text-foreground hover:text-muted-foreground font-semibold transition-colors underline"
          >
            Sign in
          </Link>
        </p>
            <p className="text-xs text-muted-foreground">
              After signing up, we will email you a verification link.{" "}
              <Link
                href="/resend-verification"
                className="text-foreground hover:text-muted-foreground font-medium transition-colors underline"
              >
                Resend verification email
              </Link>
            </p>
          </div>

          <div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              aria-label="Create a new account"
              aria-live="polite"
              data-testid="registration-form"
            >
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  {resolveCopy(COPY_KEYS.form.username.label)}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={resolveCopy(COPY_KEYS.form.username.placeholder)}
                  autoComplete="username"
                  {...register("username")}
                  className="h-12 text-primary"
                  aria-invalid={!!errors.username}
                />
                <p className="text-xs text-muted-foreground">
                  {resolveCopy(COPY_KEYS.form.username.help)}
                </p>
                {errors.username && (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  {resolveCopy(COPY_KEYS.form.email.label)}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={resolveCopy(COPY_KEYS.form.email.placeholder)}
                  autoComplete="email"
                  {...register("email")}
                  className="h-12 text-primary"
                  aria-invalid={!!errors.email}
                />
                <p className="text-xs text-muted-foreground">
                  {resolveCopy(COPY_KEYS.form.email.help)}
                </p>
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {resolveCopy(COPY_KEYS.form.password.label)}
                </Label>
                <PasswordInput
                  id="password"
                  placeholder={resolveCopy(
                    COPY_KEYS.form.password.placeholder,
                  )}
                  autoComplete="new-password"
                  {...register("password")}
                  className="h-12 pr-12 text-primary"
                  toggleClassName="right-4"
                  aria-invalid={!!errors.password}
                />
                {passwordValue ? (
                  <PasswordStrengthMeter password={passwordValue} />
                ) : null}
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">
                  {resolveCopy(COPY_KEYS.form.passwordConfirmation.label)}
                </Label>
                <PasswordInput
                  id="passwordConfirmation"
                  placeholder={resolveCopy(
                    COPY_KEYS.form.passwordConfirmation.placeholder,
                  )}
                  autoComplete="new-password"
                  {...register("passwordConfirmation")}
                  className="h-12 pr-12 text-primary"
                  toggleClassName="right-4"
                  aria-invalid={!!errors.passwordConfirmation}
                />
                {errors.passwordConfirmation && (
                  <p className="text-xs text-destructive">
                    {errors.passwordConfirmation.message}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Controller
                    name="agreeToTerms"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="terms"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="text-brand mt-0.5"
                      />
                    )}
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs text-muted-foreground cursor-pointer select-none leading-relaxed"
                  >
                    I agree to the{" "}
                    <Link
                      href={LEGAL_ROUTES.terms}
                      className="text-foreground hover:text-muted-foreground transition-colors underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href={LEGAL_ROUTES.privacy}
                      className="text-foreground hover:text-muted-foreground transition-colors underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-xs text-destructive">
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>

              {/* Global submit error */}
              {state.status === "error" && globalCopyKey ? (
                <p
                  className="text-xs text-destructive"
                  data-testid="registration-error"
                  aria-live="assertive"
                >
                  {resolveCopy(globalCopyKey) ||
                    registrationCopy.submit.error.globalFallback}
                </p>
              ) : null}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitDisabled}
                size="lg"
                className="w-full h-12 font-semibold rounded-xl"
                data-testid="registration-submit"
              >
                {state.status === "pending" ? (
                  <div
                    className="flex items-center gap-2"
                    role="status"
                    aria-live="polite"
                  >
                    <div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white"
                      aria-hidden="true"
                    />
                    Creating account…
                  </div>
                ) : (
                  <p className="text-white">Create account</p>
                )}
              </Button>
            </form>

            {/* Availability strip */}
            <div
              className="mt-2 flex flex-col gap-1"
              data-testid="signup-availability-strip"
            >
              <SignupAvailabilityStrip
                email={emailValue ?? ""}
                username={usernameValue ?? ""}
              />
            </div>
          </div>
    </AuthSplitLayout>
  );
}
