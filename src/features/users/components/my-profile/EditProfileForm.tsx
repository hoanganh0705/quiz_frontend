"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/primitives/form/TextField";
import { ImageUploadField } from "@/components/primitives/form/ImageUploadField";
import { FormErrorBanner } from "@/components/primitives/form/FormErrorBanner";
import { DraftBanner } from "@/components/primitives/form/DraftBanner";
import { useQuizForm } from "@/lib/forms/useQuizForm";
import { updateMyProfileSchema } from "@/lib/forms";
import { useDraftAutoSave } from "@/lib/forms/useDraftAutoSave";
import { useUnsavedChangesGuard } from "@/lib/forms/useUnsavedChangesGuard";
import { useUpdateMyProfile } from "@/features/users/hooks/useUpdateMyProfile";
import { useCheckUsername } from "@/features/auth/hooks/use-check-username";
import type { UserMeResponseDto } from "@/features/users/types/user-backend";
import type { z } from "zod";

export interface EditProfileFormProps {
  profile: UserMeResponseDto;
}

type EditProfileValues = z.infer<typeof updateMyProfileSchema>;

export const EditProfileForm = memo(function EditProfileForm({
  profile,
}: EditProfileFormProps) {
  const updateProfile = useUpdateMyProfile({});

  const defaultValues = useMemo<EditProfileValues>(() => {
    return {
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? null,
      pronouns:
        ((profile as unknown as Record<string, unknown>).pronouns as
          | string
          | null
          | undefined) ?? null,
      location:
        ((profile as unknown as Record<string, unknown>).location as
          | string
          | null
          | undefined) ?? null,
      websiteUrl:
        ((profile as unknown as Record<string, unknown>).websiteUrl as
          | string
          | null
          | undefined) ?? null,
      avatarPublicId: null,
    };
  }, [profile]);

  const formState = useQuizForm({
    schema: updateMyProfileSchema,
    defaultValues,
    formId: "edit-profile",
    // No `submit` injected — we call `handleSubmit` below.
  });

  const { form, reset, lastError } = formState;
  const { isSubmitting, errors, dirtyFields } = form.formState;

  const draft = useDraftAutoSave({
    form,
    formId: "edit-profile",
    userId: profile.userId,
    intervalMs: 5_000,
  });

  const { savedAt } = draft;

  const { pendingPopstate } = useUnsavedChangesGuard({
    isDirty: formState.isDirty,
    thresholdMs: 5_000,
  });

  const usernameCheck = useCheckUsername({
    username: profile.username,
    enabled: false,
    debounceMs: 400,
  });

  const handleSubmit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    await updateProfile.mutate({
      displayName: values.displayName || null,
      bio: values.bio || null,
      avatarPublicId: values.avatarPublicId ?? null,
    });
  }, [form, updateProfile]);

  useEffect(() => {
    if (updateProfile.isSuccess) {
      reset();
      draft.dismiss();
      updateProfile.resetError();
    }
  }, [updateProfile.isSuccess, reset, draft, updateProfile]);

  const isUnavailable = usernameCheck.status === "unavailable";
  const isSaving = isSubmitting || updateProfile.isPending;
  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit =
    formState.isDirty && !isSaving && !isUnavailable && !hasErrors;

  const bannerError = updateProfile.lastError
    ? {
        ...updateProfile.lastError,
        code: updateProfile.lastApiError?.code ?? "GLOBAL_UNKNOWN",
      }
    : null;

  return (
    <FormProvider {...(form as unknown as Parameters<typeof FormProvider>[0])}>
      <div className="space-y-8">
        {/* Submission error banner */}
        <FormErrorBanner
          lastError={bannerError}
          onDismiss={updateProfile.resetError}
        />

        {/* Draft restore banner */}
        <DraftBanner
          savedAt={savedAt}
          restore={draft.restore}
          dismiss={draft.dismiss}
          showRestorePrompt={!formState.isDirty}
        />

        {/* Display name */}
        <TextField
          name="displayName"
          label="Display Name"
          description="This is how you appear to other users."
          placeholder="Your display name"
          required
        />

        {/* Bio */}
        <TextField
          name="bio"
          label="Bio"
          description="A short description about yourself."
          placeholder="Tell us about yourself..."
        />

        {/* Pronouns */}
        <TextField
          name="pronouns"
          label="Pronouns"
          description="Your preferred pronouns (optional)."
          placeholder="e.g. they/them, she/her"
        />

        {/* Location */}
        <TextField
          name="location"
          label="Location"
          description="Where you're based (optional)."
          placeholder="e.g. San Francisco, CA"
        />

        {/* Website URL */}
        <TextField
          name="websiteUrl"
          label="Website"
          description="Your personal website or portfolio (optional)."
          placeholder="https://example.com"
          type="url"
        />

        {/* Avatar upload */}
        <ImageUploadField
          name={"avatarPublicId" as never}
          label="Profile Picture"
          description="Upload a photo to represent your profile."
          purpose="avatar"
        />

        {/* Username display (read-only info) */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Username</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your username is{" "}
            <span className="font-medium">{profile.username}</span> and cannot
            be changed after registration.
          </p>
          {isUnavailable && (
            <p className="text-xs text-destructive mt-2" role="alert">
              Username is unavailable.
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-2"
            aria-label="Save profile changes"
          >
            {isSaving && (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            )}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
          {formState.isDirty && !isSaving && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes.
            </p>
          )}
        </div>

        {/* Unsaved-changes guard visual feedback */}
        {pendingPopstate && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-600">
              Unsaved Changes
            </p>
            <p className="text-sm text-amber-700 mt-1">
              You have unsaved changes. Navigating away will discard them.
            </p>
          </div>
        )}
      </div>
    </FormProvider>
  );
});
