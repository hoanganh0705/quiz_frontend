"use client";

import * as React from "react";

import { ConfirmDialog } from "@/components/primitives";

export interface AttemptAbandonDialogProps {
  open: boolean;

  onConfirm: () => void | Promise<void>;

  onCancel: () => void;

  isPending?: boolean;

  typedConfirmRequired?: boolean;
}

export function AttemptAbandonDialog(
  props: AttemptAbandonDialogProps,
): React.ReactElement {
  const {
    open,
    onConfirm,
    onCancel,
    isPending = false,
    typedConfirmRequired = true,
  } = props;

  return (
    <ConfirmDialog
      open={open}
      kind="destructive-permanent"
      entityLabel="this attempt"

      typedConfirmRequired={typedConfirmRequired}
      typedOverride="abandon"
      confirmLabel="Abandon attempt"
      cancelLabel="Go back"
      loading={isPending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      data-testid="attempt-abandon-dialog"
    />
  );
}
