"use client";

import { memo, useCallback, useEffect, useId, useRef, useState } from "react";

import { Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import {
  useChangePassword,
  type ChangePasswordFieldErrors,
  type UseChangePasswordDeps,
} from "@/features/auth/hooks/use-change-password";
import {
  COPY_KEYS as PASSWORD_COPY_KEYS,
  resolveCopy as resolvePasswordCopy,
} from "@/features/auth/copy/password-copy";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { InlineError } from "@/components/ui/loading-states/ErrorState";

import { ChangePasswordSuccessBanner } from "./change-password-success-banner";
import { PasswordInput } from "./password-input";
import { PasswordStrengthMeter } from "./password-strength-meter";

export interface ChangePasswordCardProps {
  hookDeps?: UseChangePasswordDeps;

  onCollapseAfterSuccess?: () => void;
}

type FieldName = "currentPassword" | "newPassword" | "confirmPassword";

function ChangePasswordCardInner({
  hookDeps,
  onCollapseAfterSuccess,
}: ChangePasswordCardProps) {
  const currentFieldId = useId();
  const newFieldId = useId();
  const confirmFieldId = useId();

  const { change, status, error, reset } = useChangePassword(hookDeps);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverFieldErrors: ChangePasswordFieldErrors | undefined =
    error && "fieldErrors" in error
      ? (error.fieldErrors as ChangePasswordFieldErrors)
      : undefined;

  const currentKind = error?.classification.kind ?? null;
  useEffect(() => {
    if (currentKind === "invalid_current") {
      setCurrentPassword("");
    }
  }, [currentKind]);

  useEffect(() => {
    if (status === "success" && !showSuccess) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowSuccess(true);
      reset();

      if (onCollapseAfterSuccess && collapseTimerRef.current === null) {
        collapseTimerRef.current = setTimeout(() => {
          collapseTimerRef.current = null;
          onCollapseAfterSuccess();
        }, 3000);
      }
    }
    return () => {
      if (collapseTimerRef.current !== null) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, [status, showSuccess, reset, onCollapseAfterSuccess]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (status === "pending") return;
      if (!currentPassword || !newPassword || !confirmPassword) return;
      void change({ currentPassword, newPassword, confirmPassword });
    },
    [change, currentPassword, newPassword, confirmPassword, status],
  );

  const handleCancel = useCallback((): void => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    reset();
  }, [reset]);

  const handleDismissSuccess = useCallback((): void => {
    setShowSuccess(false);
  }, []);

  const handleRetry = useCallback((): void => {
    if (status === "pending") return;
    if (!currentPassword || !newPassword || !confirmPassword) return;
    void change({ currentPassword, newPassword, confirmPassword });
  }, [change, currentPassword, newPassword, confirmPassword, status]);

  const errorFor = (field: FieldName): string | null => {
    const err = serverFieldErrors?.[field];
    if (err) {
      return resolveFieldErrorKey(field, err);
    }
    return null;
  };

  const resolveFieldErrorKey = (field: FieldName, key: string): string => {
    const KEY_MAP: Record<string, string> = {
      invalidCurrent: PASSWORD_COPY_KEYS.password.errors.invalidCurrent,
      reuse: PASSWORD_COPY_KEYS.password.errors.reuse,
      mismatch: PASSWORD_COPY_KEYS.password.errors.mismatch,
      weak: PASSWORD_COPY_KEYS.password.errors.weak,
      equalToCurrent: PASSWORD_COPY_KEYS.password.errors.equalToCurrent,
      required: PASSWORD_COPY_KEYS.password.errors.required,
      tooShort: PASSWORD_COPY_KEYS.password.errors.tooShort,
    };
    void field;
    return resolvePasswordCopy(KEY_MAP[key] ?? key);
  };

  const showStrengthMeter = newPassword.length > 0;

  const submitDisabled =
    status === "pending" ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword;

  const currentFieldError = errorFor("currentPassword");
  const newFieldError = errorFor("newPassword");
  const confirmFieldError = errorFor("confirmPassword");

  const classificationKind = error?.classification.kind;
  const bannerCopy =
    classificationKind === "conflict"
      ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.conflict)
      : classificationKind === "auth_terminal"
        ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.authTerminal)
        : classificationKind === "retryable"
          ? resolvePasswordCopy(PASSWORD_COPY_KEYS.password.error.retryable)
          : null;

  return (
    <Card
      data-testid="change-password-card"
      data-status={status}
      className="mt-6"
    >
      <CardHeader>
        <CardTitle className="text-xl">
          {resolvePasswordCopy(
            PASSWORD_COPY_KEYS.password.changePassword.title,
          )}
        </CardTitle>
        <CardDescription>
          {resolvePasswordCopy(
            PASSWORD_COPY_KEYS.password.changePassword.subtitle,
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showSuccess && (
          <div className="mb-6" data-testid="change-password-success-slot">
            <ChangePasswordSuccessBanner onDismiss={handleDismissSuccess} />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-busy={status === "pending"}
          data-testid="change-password-form"
        >
          {/* ─── Current password field ─────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor={currentFieldId} className="text-sm font-medium">
              {resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.currentLabel,
              )}
            </Label>
            <PasswordInput
              id={currentFieldId}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.currentPlaceholder,
              )}
              disabled={status === "pending"}
              aria-invalid={Boolean(currentFieldError)}
              aria-describedby={
                currentFieldError ? `${currentFieldId}-error` : undefined
              }
              revealLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.reveal,
              )}
              hideLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.hide,
              )}
              toggleTestId="change-password-current-reveal"
              iconClassName="w-4 h-4"
              toggleClassName="right-2"
              className={cn(
                "pr-10",
                currentFieldError &&
                  "border-destructive focus-visible:border-destructive",
              )}
            />
            {currentFieldError && (
              <p
                id={`${currentFieldId}-error`}
                className="text-sm text-destructive"
                role="alert"
                data-testid="change-password-current-error"
              >
                {currentFieldError}
              </p>
            )}
          </div>

          {/* ─── New password field ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor={newFieldId} className="text-sm font-medium">
              {resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.newLabel,
              )}
            </Label>
            <PasswordInput
              id={newFieldId}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.newPlaceholder,
              )}
              disabled={status === "pending"}
              aria-invalid={Boolean(newFieldError)}
              aria-describedby={
                newFieldError ? `${newFieldId}-error` : undefined
              }
              revealLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.reveal,
              )}
              hideLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.hide,
              )}
              toggleTestId="change-password-new-reveal"
              iconClassName="w-4 h-4"
              toggleClassName="right-2"
              className={cn(
                "pr-10",
                newFieldError &&
                  "border-destructive focus-visible:border-destructive",
              )}
            />
            {newFieldError && (
              <p
                id={`${newFieldId}-error`}
                className="text-sm text-destructive"
                role="alert"
                data-testid="change-password-new-error"
              >
                {newFieldError}
              </p>
            )}
            {showStrengthMeter && (
              <PasswordStrengthMeter
                password={newPassword}
                className="mt-2"
                testId="change-password-strength"
                labelTestId="change-password-strength-label"
                heading={resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.strength.heading,
                )}
                requirementsCopy={resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.strength.requirements,
                )}
                labelResolver={(score) =>
                  resolvePasswordCopy(
                    score >= 4
                      ? PASSWORD_COPY_KEYS.password.strength.strong
                      : score === 3
                        ? PASSWORD_COPY_KEYS.password.strength.good
                        : score === 2
                          ? PASSWORD_COPY_KEYS.password.strength.fair
                          : score === 1
                            ? PASSWORD_COPY_KEYS.password.strength.weak
                            : PASSWORD_COPY_KEYS.password.strength.tooWeak,
                  )
                }
              />
            )}
          </div>

          {/* ─── Confirm new password field ─────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor={confirmFieldId} className="text-sm font-medium">
              {resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.confirmLabel,
              )}
            </Label>
            <PasswordInput
              id={confirmFieldId}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.confirmPlaceholder,
              )}
              disabled={status === "pending"}
              aria-invalid={Boolean(confirmFieldError)}
              aria-describedby={
                confirmFieldError ? `${confirmFieldId}-error` : undefined
              }
              revealLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.reveal,
              )}
              hideLabel={resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.hide,
              )}
              toggleTestId="change-password-confirm-reveal"
              iconClassName="w-4 h-4"
              toggleClassName="right-2"
              className={cn(
                "pr-10",
                confirmFieldError &&
                  "border-destructive focus-visible:border-destructive",
              )}
            />
            {confirmFieldError && (
              <p
                id={`${confirmFieldId}-error`}
                className="text-sm text-destructive"
                role="alert"
                data-testid="change-password-confirm-error"
              >
                {confirmFieldError}
              </p>
            )}
          </div>

          {bannerCopy && (
            <div
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-center justify-between gap-2"
              role="alert"
              data-testid="change-password-banner"
            >
              <p className="text-sm text-destructive">{bannerCopy}</p>
              {classificationKind === "retryable" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={submitDisabled}
                  className="shrink-0 gap-1"
                  data-testid="change-password-retry"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {error &&
            !bannerCopy &&
            !currentFieldError &&
            !newFieldError &&
            !confirmFieldError && (
              <InlineError
                message={resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.error.generic,
                )}
              />
            )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
            <a
              href="/forgot-password"
              className="text-sm text-default hover:underline"
              data-testid="change-password-forgot-link"
            >
              {resolvePasswordCopy(
                PASSWORD_COPY_KEYS.password.changePassword.forgotLink,
              )}
            </a>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={status === "pending"}
                data-testid="change-password-cancel"
              >
                {resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.changePassword.cancel,
                )}
              </Button>
              <Button
                type="submit"
                disabled={submitDisabled}
                data-testid="change-password-submit"
              >
                {status === "pending" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {resolvePasswordCopy(
                  PASSWORD_COPY_KEYS.password.changePassword.submit,
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export const ChangePasswordCard = memo(ChangePasswordCardInner);
