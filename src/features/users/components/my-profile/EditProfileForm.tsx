'use client';

/**
 * `EditProfileForm` — canonical profile-edit form for Epic 4.3.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.D1.
 *
 * ## What this component owns
 *
 * Receives `profile` as a prop (not fetched here — the parent owns the
 * `useMyProfile()` call). Renders a `useQuizForm` with `updateMyProfileSchema`,
 * checks username availability with `useCheckUsername`, shows a `DraftBanner`
 * for 5-second localStorage auto-save, mounts `useUnsavedChangesGuard` for
 * navigate-away protection, and calls `useUpdateMyProfile.mutate()` on submit.
 *
 * ## Draft auto-save (Epic 4.2 TKT-4.2.C2)
 *
 * Mounts `useDraftAutoSave` with a 5-second interval. If the browser is
 * closed and reopened, the `<DraftBanner />` prompts the user to restore
 * their draft. On successful submit, the draft is dismissed.
 *
 * ## Unsaved-changes guard (Epic 4.2 TKT-4.2.C3)
 *
 * Mounts `useUnsavedChangesGuard` with a 5-second dirty threshold.
 * Navigating away while dirty (and past the threshold) shows a
 * `beforeunload` browser prompt. The consumer is responsible for rendering
 * the `<ConfirmDialog />` for in-app navigation interception.
 */

import { memo, useCallback, useEffect, useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/primitives/form/TextField';
import { ImageUploadField } from '@/components/primitives/form/ImageUploadField';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { DraftBanner } from '@/components/primitives/form/DraftBanner';
import { useQuizForm } from '@/lib/forms/useQuizForm';
import { updateMyProfileSchema } from '@/lib/forms';
import { useDraftAutoSave } from '@/lib/forms/useDraftAutoSave';
import { useUnsavedChangesGuard } from '@/lib/forms/useUnsavedChangesGuard';
import { useUpdateMyProfile } from '@/features/users/hooks/useUpdateMyProfile';
import {
  useCheckUsername,
} from '@/features/auth/hooks/use-check-username';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import type { z } from 'zod';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface EditProfileFormProps {
  /**
   * The authenticated user's full profile. The parent owns the
   * `useMyProfile()` call and passes `profile` here.
   */
  profile: UserMeResponseDto;
}

// ─── Form values type ───────────────────────────────────────────────────────

type EditProfileValues = z.infer<typeof updateMyProfileSchema>;

// ─── Root component ─────────────────────────────────────────────────────────

/**
 * `<EditProfileForm profile={profile} />` — the canonical profile-edit form.
 *
 * Renders a full profile edit form with draft auto-save, unsaved-changes
 * guard, username availability feedback, and optimistic mutation.
 */
export const EditProfileForm = memo(function EditProfileForm({
  profile,
}: EditProfileFormProps) {
  const updateProfile = useUpdateMyProfile({});

  // ── Default values from profile ──────────────────────────────────────────

  const defaultValues = useMemo<EditProfileValues>(() => {
    return {
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? null,
      pronouns: ((profile as unknown as Record<string, unknown>).pronouns as string | null | undefined) ?? null,
      location: ((profile as unknown as Record<string, unknown>).location as string | null | undefined) ?? null,
      websiteUrl: ((profile as unknown as Record<string, unknown>).websiteUrl as string | null | undefined) ?? null,
      avatarUrl: profile.avatarUrl ?? null,
    };
  }, [profile]);

  // ── Quiz form ────────────────────────────────────────────────────────────
  // We don't inject `submit` into `useQuizForm` because we need to call
  // `useUpdateMyProfile.mutate` with the validated values. Instead, we
  // call `form.trigger()` for validation and `form.getValues()` to read
  // the current values before invoking the mutation.

  const formState = useQuizForm({
    schema: updateMyProfileSchema,
    defaultValues,
    formId: 'edit-profile',
    // No `submit` injected — we call `handleSubmit` below.
  });

  const { form, reset, lastError } = formState;
  const { isSubmitting, errors, dirtyFields } = form.formState;

  // ── Draft auto-save (Epic 4.2 TKT-4.2.C2) ───────────────────────────────

  const draft = useDraftAutoSave({
    form,
    formId: 'edit-profile',
    userId: profile.userId,
    intervalMs: 5_000,
  });

  const { savedAt } = draft;

  // ── Unsaved-changes guard (Epic 4.2 TKT-4.2.C3) ───────────────────────

  const { pendingPopstate } = useUnsavedChangesGuard({
    isDirty: formState.isDirty,
    thresholdMs: 5_000,
  });

  // ── Username availability ─────────────────────────────────────────────────
  // `useCheckUsername` is mounted for future-proofing (username is read-only).

  const usernameCheck = useCheckUsername({
    username: profile.username,
    enabled: false, // username is read-only after registration
    debounceMs: 400,
  });

  // ── Submit ───────────────────────────────────────────────────────────────
  // Validate with `form.trigger()` then call the mutation.

  const handleSubmit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    await updateProfile.mutate({
      displayName: values.displayName || null,
      bio: values.bio || null,
      avatarUrl: values.avatarUrl ?? null,
    });
  }, [form, updateProfile]);

  // On success: clear dirty state, dismiss draft, reset form.
  useEffect(() => {
    if (updateProfile.isSuccess) {
      reset();
      draft.dismiss();
      updateProfile.resetError();
    }
  }, [updateProfile.isSuccess, reset, draft, updateProfile]);

  // ── Derived state ────────────────────────────────────────────────────────

  const isUnavailable = usernameCheck.status === 'unavailable';
  const isSaving = isSubmitting || updateProfile.isPending;
  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit =
    formState.isDirty && !isSaving && !isUnavailable && !hasErrors;

  // Transform `useUpdateMyProfile.lastError` to the `FormErrorBanner` shape.
  const bannerError = updateProfile.lastError
    ? {
        ...updateProfile.lastError,
        code: updateProfile.lastApiError?.code ?? 'GLOBAL_UNKNOWN',
      }
    : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <FormProvider
      {...(form as unknown as Parameters<typeof FormProvider>[0])}
    >
      <div className="space-y-8">
        {/* Submission error banner */}
        <FormErrorBanner lastError={bannerError} onDismiss={updateProfile.resetError} />

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
          name="avatarUrl"
          label="Profile Picture"
          description="Upload a photo to represent your profile."
        />

        {/* Username display (read-only info) */}
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Username</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your username is{' '}
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
              <Loader2
                className="w-4 h-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {isSaving ? 'Saving…' : 'Save Changes'}
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
