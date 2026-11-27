"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AtSign, Loader2, Lock, Mail, User } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { updateMyProfileSchema } from "@/lib/forms";
import { useToast } from "@/lib/forms/useToast";
import { deriveUrlClient } from "@/lib/storage/public-id-pattern";

import { useUpdateMyProfile } from "@/features/users/hooks/useUpdateMyProfile";

import { FormErrorBanner } from "@/components/primitives/form/FormErrorBanner";
import { ImageUploadField } from "@/components/primitives/form/ImageUploadField";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";
import type { UseFormReturn } from "react-hook-form";

export interface AccountSettingsProps {
  profile: UserMeResponseDto | null;
}

type AccountSettingsFormValues = z.infer<typeof updateMyProfileSchema> & {
  username: string;
  email: string;
};

const AvatarRow = memo(function AvatarRow({
  profile,
  displayName,
  form,
}: {
  profile: UserMeResponseDto;
  displayName: string;
  form: UseFormReturn<AccountSettingsFormValues>;
}) {
  const initials = useMemo(() => {
    const trimmed = displayName.trim();
    if (!trimmed) return "?";
    return trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  const currentPublicId = form.watch("avatarPublicId");
  const previewUrl = currentPublicId
    ? deriveUrlClient(currentPublicId, "avatar")
    : (profile.avatarUrl ?? null);

  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center pb-5 border-b border-border/60">
      <Avatar className="h-20 w-20 border-2 border-border shrink-0">
        <AvatarImage
          src={previewUrl ?? undefined}
          alt={`${displayName || "User"}'s profile picture`}
          loading="lazy"
        />
        <AvatarFallback className="text-xl bg-muted text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 w-full">
        <ImageUploadField<z.ZodType<AccountSettingsFormValues>>
          name="avatarPublicId"
          label="Profile Photo"
          description="Visible to other players. JPG, PNG, or WEBP up to 5 MB."
          purpose="avatar"
        />
      </div>
    </div>
  );
});

export const AccountSettings = memo(function AccountSettings({
  profile,
}: AccountSettingsProps) {
  const updateProfile = useUpdateMyProfile({});
  const toast = useToast();

  const defaultValues = useMemo<AccountSettingsFormValues | null>(() => {
    if (!profile) return null;
    return {
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? "",
      avatarPublicId: null,
      username: profile.username,
      email: profile.email,
    };
  }, [profile]);

  const form = useForm<AccountSettingsFormValues>({
    defaultValues: defaultValues ?? undefined,
    resolver: zodResolver(updateMyProfileSchema) as never,
  });

  useEffect(() => {
    form.reset(defaultValues ?? undefined);
  }, [profile, defaultValues, form]);

  useEffect(() => {
    if (updateProfile.isSuccess) {
      toast.push({
        title: "Profile saved",
        body: "Your changes have been saved.",
        durationMs: 3000,
      });
      form.reset(form.getValues());
      updateProfile.resetError();
    }
  }, [updateProfile.isSuccess, toast, form, updateProfile]);

  const handleFormSubmit = useCallback(
    async (values: AccountSettingsFormValues) => {
      await updateProfile.mutate({
        displayName: values.displayName || null,
        bio: values.bio?.trim() ? values.bio.trim() : null,
        avatarPublicId: values.avatarPublicId ?? null,
      });
    },
    [updateProfile],
  );

  if (!profile || !defaultValues) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const { formState } = form;
  const isSaving = formState.isSubmitting || updateProfile.isPending;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your public profile details and review your account identity.
        </p>
      </div>

      <FormErrorBanner
        lastError={
          updateProfile.lastError
            ? {
                ...updateProfile.lastError,
                code: updateProfile.lastApiError?.code ?? "GLOBAL_UNKNOWN",
              }
            : null
        }
        onDismiss={updateProfile.resetError}
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <Card className="bg-card border-border rounded-xl gap-0 py-0 overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/60">
              <CardTitle>
                <h3 className="text-base font-semibold text-foreground">
                  Profile &amp; Identity
                </h3>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <AvatarRow
                profile={profile}
                displayName={profile.displayName ?? profile.username}
                form={form}
              />

              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-1.5">
                  <User
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  {...form.register("displayName")}
                  disabled={isSaving}
                  className="bg-background"
                  aria-invalid={Boolean(form.formState.errors.displayName)}
                  aria-describedby={
                    form.formState.errors.displayName
                      ? "displayName-error"
                      : undefined
                  }
                />
                {form.formState.errors.displayName && (
                  <p
                    id="displayName-error"
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...form.register("bio")}
                  disabled={isSaving}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell other players a bit about yourself..."
                  className="bg-background resize-none"
                  aria-invalid={Boolean(form.formState.errors.bio)}
                  aria-describedby={
                    form.formState.errors.bio ? "bio-error" : undefined
                  }
                />
                {form.formState.errors.bio && (
                  <p
                    id="bio-error"
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {form.formState.errors.bio.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="flex items-center gap-1.5">
                    <AtSign
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={profile.username}
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-default select-all"
                    aria-label="Username (read-only — usernames cannot be changed)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Permanent handle — cannot be changed.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-default select-all"
                    aria-label="Email address (read-only)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to update your email.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {form.formState.isDirty
                  ? "You have unsaved profile changes."
                  : "All profile changes are saved."}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {form.formState.isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={() => form.reset(defaultValues)}
                    className="h-10 sm:h-9"
                  >
                    Discard
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSaving || !form.formState.isDirty}
                  className="h-10 sm:h-9 gap-2 bg-default text-default-foreground hover:bg-default-hover"
                  aria-label="Save account changes"
                >
                  {isSaving && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>

      <div className="rounded-xl border border-border bg-card px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Lock
            className="h-4 w-4 text-muted-foreground shrink-0 mt-1"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Password &amp; Security
            </h3>
            <p className="text-sm text-muted-foreground">
              Change your password or revoke active device sessions.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-10 sm:h-9 gap-2 shrink-0 self-start sm:self-auto"
          aria-label="Manage password and active sessions"
        >
          <Link href="/settings/security">
            Manage Security
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
});
