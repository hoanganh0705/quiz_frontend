"use client";

import { useId } from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import type { ApiError } from "@/lib/api";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";

export interface SlugConflictNoticeProps {
  error: ApiError;

  mode: "create" | "edit" | "restore";

  renamedSlug: string;

  onRenamedSlugChange: (slug: string) => void;

  conflictingTagName?: string;
  disabled?: boolean;
}

function getConflictingTagId(error: ApiError): string | undefined {
  return (
    error as unknown as {
      data?: { extensions?: { conflictingTagId?: string } };
    }
  ).data?.extensions?.conflictingTagId;
}

export function SlugConflictNotice({
  error,
  mode,
  renamedSlug,
  onRenamedSlugChange,
  conflictingTagName,
  disabled = false,
}: SlugConflictNoticeProps) {
  const inputId = useId();
  const requestId = error.requestId;
  const conflictingTagId = getConflictingTagId(error);

  return (
    <div className="space-y-4">
      {/* Warning banner */}
      <div
        className="flex items-start gap-3 p-3.5 rounded-xl border border-warning/30 bg-warning/10"
        role="alert"
      >
        <AlertTriangle
          className="h-5 w-5 text-warning shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {mode === "restore"
              ? "Slug conflict — rename before restoring"
              : "Slug is already taken"}
          </p>
          {conflictingTagName ? (
            <p className="text-xs text-muted-foreground">
              The slug &ldquo;{renamedSlug || "(pending)"}&rdquo; is taken by{" "}
              <strong className="text-foreground">{conflictingTagName}</strong>.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose a different slug to continue.
            </p>
          )}
          {conflictingTagId && (
            <p className="text-xs text-muted-foreground font-mono">
              Conflicting tag ID: {conflictingTagId}
            </p>
          )}
        </div>
      </div>

      {/* Rename input */}
      <div className="space-y-2">
        <Label htmlFor={inputId}>
          {mode === "restore" ? "New slug" : "Choose a slug"}
        </Label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            type="text"
            value={renamedSlug}
            onChange={(e) => onRenamedSlugChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. javascript-basics-alt"
            aria-describedby={`${inputId}-hint`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !renamedSlug.trim()}
            title="Auto-derive slug from the original tag name"
            aria-label="Derive a new slug automatically"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          Use lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      {/* Request ID correlation */}
      {requestId && <RequestIdBanner error={error} />}
    </div>
  );
}
