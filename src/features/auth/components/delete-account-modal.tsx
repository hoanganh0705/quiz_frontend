"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";

import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/deletion-copy";
import { isInvalidCurrentPasswordDeletion } from "@/features/auth/errors/deletion-error-mapper";
import {
  DELETION_INTENT_TOKEN,
  type UseDeleteAccountResult,
} from "@/features/auth/hooks/use-delete-account";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import {
  DeleteAccountBannerError,
  resolveDeleteAccountCopy,
} from "./delete-account-banner-error";

export interface DeleteAccountModalProps {
  open: boolean;

  onOpenChange: (open: boolean) => void;

  hook: UseDeleteAccountResult;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  hook,
}: DeleteAccountModalProps): React.JSX.Element {
  const [password, setPassword] = useState("");
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  useEffect(() => {
    return () => {
      setPassword("");
      setTypedConfirmation("");
      setRevealPassword(false);
    };
  }, []);

  const state = hook.state;

  const isPending = state.kind === "pending";
  const isCleanup = state.kind === "cleanup";
  const isCompleted = state.kind === "completed";
  const isTerminal = isCleanup || isCompleted;

  const error =
    state.kind === "idle" || state.kind === "pending"
      ? state.error
      : state.kind === "uncertain"
        ? state.error
        : null;

  const classification = error?.classification ?? null;

  const passwordFieldError = Boolean(
    classification && isInvalidCurrentPasswordDeletion(classification),
  );

  const bannerError =
    classification && !isInvalidCurrentPasswordDeletion(classification)
      ? classification
      : null;

  const canSubmit =
    state.kind === "idle" &&
    password.length > 0 &&
    typedConfirmation === DELETION_INTENT_TOKEN &&
    !isTerminal;

  const passwordDisabled = isPending || isCleanup || isCompleted;

  const handleCloseAttempt = useCallback(
    (next: boolean) => {
      if (!next && (isPending || isTerminal)) {
        return;
      }
      if (!next) {
        hook.reset({ setPassword, setTypedConfirmation });
        setRevealPassword(false);
      }
      onOpenChange(next);
    },
    [hook, isPending, isTerminal, onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!canSubmit) return;
      await hook.submit(password, typedConfirmation);
    },
    [canSubmit, hook, password, typedConfirmation],
  );

  const handleRecheck = useCallback(async (): Promise<void> => {
    await hook.revalidate();
  }, [hook]);

  const handleCancel = useCallback((): void => {
    handleCloseAttempt(false);
  }, [handleCloseAttempt]);

  const copy = useMemo(() => resolveDeleteAccountCopy(), []);

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isTerminal && !isPending}
        onEscapeKeyDown={(e) => {
          if (isTerminal || isPending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isTerminal || isPending) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isTerminal || isPending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>

        {isCleanup || isCompleted ? (
          <div className="space-y-3 py-6" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <Loader2
                className="h-5 w-5 animate-spin text-foreground"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">{copy.cleanupHeading}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{copy.cleanupBody}</p>
            {isCompleted ? (
              <p className="text-sm text-muted-foreground">
                {resolveCopy(COPY_KEYS.deletion.publicLanding.notice)}
              </p>
            ) : null}
          </div>
        ) : (
          <form
            id="delete-account-form"
            onSubmit={handleSubmit}
            className="space-y-4 py-4"
          >
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/10 p-3"
              role="note"
            >
              <p className="text-sm font-medium text-destructive">
                {copy.consequenceHeading}
              </p>
              <p className="mt-2 text-sm text-destructive/80">
                {copy.consequenceBody}
              </p>
            </div>

            {bannerError ? (
              <DeleteAccountBannerError
                classification={bannerError}
                copy={copy}
                onRecheck={handleRecheck}
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="delete-account-password">
                {copy.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="delete-account-password"
                  type={revealPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  autoComplete="current-password"
                  disabled={passwordDisabled}
                  aria-invalid={passwordFieldError}
                  aria-describedby={
                    passwordFieldError
                      ? "delete-account-password-error"
                      : undefined
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setRevealPassword((v) => !v)}
                  disabled={passwordDisabled}
                  aria-label={revealPassword ? copy.hide : copy.reveal}
                  className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  tabIndex={0}
                >
                  {revealPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordFieldError ? (
                <p
                  id="delete-account-password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {copy.invalidCurrentField}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-account-typed">{copy.typedLabel}</Label>
              <Input
                id="delete-account-typed"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={copy.typedPlaceholder}
                disabled={passwordDisabled}
                aria-describedby="delete-account-typed-hint"
                className="font-mono"
              />
              <p
                id="delete-account-typed-hint"
                className="text-xs text-muted-foreground"
              >
                {copy.typedHint}
              </p>
            </div>
          </form>
        )}

        {!isCleanup && !isCompleted ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              form="delete-account-form"
              variant="destructive"
              disabled={!canSubmit}
              aria-busy={isPending}
              aria-label={copy.submit}
            >
              {isPending ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {copy.submitPending}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          </DialogFooter>
        ) : isCleanup ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled
              aria-busy={true}
              aria-label={copy.cleanupPending}
            >
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {copy.cleanupPending}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
