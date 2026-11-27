"use client";

import { RefreshCw } from "lucide-react";

import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/deletion-copy";
import {
  isDeletionConflict,
  isDeletionUncertain,
  isDeletionValidation,
  type DeletionErrorClassification,
} from "@/features/auth/errors/deletion-error-mapper";

import { Button } from "@/components/ui/Button";

export interface DeleteAccountCopy {
  title: string;
  body: string;
  consequenceHeading: string;
  consequenceBody: string;
  typedLabel: string;
  typedPlaceholder: string;
  typedHint: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  reveal: string;
  hide: string;
  submit: string;
  cancel: string;
  submitPending: string;
  cleanupPending: string;
  cleanupHeading: string;
  cleanupBody: string;
  invalidCurrentField: string;
  invalidCurrentBanner: string;
  conflictBanner: string;
  conflictRevalidateCta: string;
  notFoundBanner: string;
  uncertainBanner: string;
  uncertainRevalidateCta: string;
  authTerminalBanner: string;
  validationEmptyPassword: string;
  validationBanner: string;
}

export function resolveDeleteAccountCopy(): DeleteAccountCopy {
  return {
    title: resolveCopy(COPY_KEYS.deletion.confirm.title),
    body: resolveCopy(COPY_KEYS.deletion.confirm.body),
    consequenceHeading: resolveCopy(
      COPY_KEYS.deletion.confirm.consequenceHeading,
    ),
    consequenceBody: resolveCopy(COPY_KEYS.deletion.confirm.consequenceBody),
    typedLabel: resolveCopy(COPY_KEYS.deletion.typed.label),
    typedPlaceholder: resolveCopy(COPY_KEYS.deletion.typed.placeholder),
    typedHint: resolveCopy(COPY_KEYS.deletion.typed.hint),
    passwordLabel: resolveCopy(COPY_KEYS.deletion.password.label),
    passwordPlaceholder: resolveCopy(COPY_KEYS.deletion.password.placeholder),
    reveal: resolveCopy(COPY_KEYS.deletion.password.reveal),
    hide: resolveCopy(COPY_KEYS.deletion.password.hide),
    submit: resolveCopy(COPY_KEYS.deletion.actions.submit),
    cancel: resolveCopy(COPY_KEYS.deletion.actions.cancel),
    submitPending: resolveCopy(COPY_KEYS.deletion.actions.submitPending),
    cleanupPending: resolveCopy(COPY_KEYS.deletion.actions.cleanupPending),
    cleanupHeading: resolveCopy(COPY_KEYS.deletion.cleanup.heading),
    cleanupBody: resolveCopy(COPY_KEYS.deletion.cleanup.body),
    invalidCurrentField: resolveCopy(
      COPY_KEYS.deletion.errors.invalidCurrentField,
    ),
    invalidCurrentBanner: resolveCopy(
      COPY_KEYS.deletion.errors.invalidCurrentBanner,
    ),
    conflictBanner: resolveCopy(COPY_KEYS.deletion.errors.conflictBanner),
    conflictRevalidateCta: resolveCopy(
      COPY_KEYS.deletion.errors.conflictRevalidateCta,
    ),
    notFoundBanner: resolveCopy(COPY_KEYS.deletion.errors.notFoundBanner),
    uncertainBanner: resolveCopy(COPY_KEYS.deletion.errors.uncertainBanner),
    uncertainRevalidateCta: resolveCopy(
      COPY_KEYS.deletion.errors.uncertainRevalidateCta,
    ),
    authTerminalBanner: resolveCopy(
      COPY_KEYS.deletion.errors.authTerminalBanner,
    ),
    validationEmptyPassword: resolveCopy(
      COPY_KEYS.deletion.errors.validationEmptyPassword,
    ),
    validationBanner: resolveCopy(COPY_KEYS.deletion.errors.validationBanner),
  };
}

export function DeleteAccountBannerError({
  classification,
  copy,
  onRecheck,
}: {
  classification: DeletionErrorClassification;
  copy: DeleteAccountCopy;
  onRecheck: () => void | Promise<void>;
}): React.JSX.Element {
  if (isDeletionConflict(classification)) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {copy.conflictBanner}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRecheck()}
          className="mt-2"
        >
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
          {copy.conflictRevalidateCta}
        </Button>
      </div>
    );
  }

  if (isDeletionUncertain(classification)) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {copy.uncertainBanner}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRecheck()}
          className="mt-2"
        >
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
          {copy.uncertainRevalidateCta}
        </Button>
      </div>
    );
  }

  if (classification.kind === "auth_terminal") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {copy.authTerminalBanner}
        </p>
      </div>
    );
  }

  if (classification.kind === "not_found") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-border bg-muted p-3"
      >
        <p className="text-sm text-muted-foreground">{copy.notFoundBanner}</p>
      </div>
    );
  }

  if (isDeletionValidation(classification)) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20"
      >
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {copy.validationBanner}
        </p>
      </div>
    );
  }

  return (
    <div role="alert" className="rounded-lg border border-border bg-muted p-3">
      <p className="text-sm text-muted-foreground">{copy.uncertainBanner}</p>
    </div>
  );
}
