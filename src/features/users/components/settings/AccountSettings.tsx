'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FormProvider,
  useForm,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/lib/forms/useToast';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { ImageUploadField } from '@/components/primitives/form/ImageUploadField';
import {
  useUpdateMyProfile,
  type UseUpdateMyProfileReturn,
} from '@/features/users/hooks/useUpdateMyProfile';
import {
  useCheckUsername,
} from '@/features/auth/hooks/use-check-username';
import { updateMyProfileSchema } from '@/lib/forms';
import { deriveUrlClient } from '@/lib/storage/public-id-pattern';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import {
  User,
  Mail,
  AtSign,
  Camera,
  Lock,
  Check,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface AccountSettingsProps {
  profile: UserMeResponseDto | null;
}

type AccountSettingsFormValues = z.infer<typeof updateMyProfileSchema> & {
  username: string;
  email: string;
};

const AvatarSection = memo(function AvatarSection({
  profile,
  displayName,
  isSaving,
  form,
}: {
  profile: UserMeResponseDto;
  displayName: string;
  isSaving: boolean;
  form: UseFormReturn<AccountSettingsFormValues>;
}) {
  const initials = useMemo(() => {
    if (!displayName) return '?';
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  const currentPublicId = form.watch('avatarPublicId');
  const previewUrl = currentPublicId
    ? deriveUrlClient(currentPublicId, 'avatar')
    : profile.avatarUrl ?? null;

  return (
    <Card className="border-border/40 py-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" aria-hidden="true" />
          Profile Picture
        </CardTitle>
        <CardDescription>
          Your profile picture is visible to other users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <Avatar className="w-24 h-24 border-4 border-primary/20">
            <AvatarImage
              src={previewUrl ?? undefined}
              alt={`${displayName ?? 'User'}'s profile picture`}
              loading="lazy"
            />
            <AvatarFallback className="text-2xl bg-primary/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <ImageUploadField<z.ZodType<AccountSettingsFormValues>>
              name="avatarPublicId"
              label="Replace photo"
              description="JPG, PNG, or WEBP. Max 5 MB."
              purpose="avatar"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const UsernameField = memo(function UsernameField({
  username,
  disabled,
}: {
  username: string;
  disabled: boolean;
}) {
  const { status } = useCheckUsername({
    username,
    enabled: false,
    debounceMs: 400,
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          id="username"
          type="text"
          value={username}
          readOnly
          disabled={disabled}
          className="bg-muted/50"
          aria-label="Username (read-only — usernames cannot be changed)"
        />
        {status === 'checking' && (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {status === 'available' && (
          <Check
            className="h-4 w-4 text-success"
            aria-hidden="true"
          />
        )}
        {status === 'unavailable' && (
          <AlertCircle
            className="h-4 w-4 text-destructive"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AtSign className="h-3 w-3" aria-hidden="true" />
        Usernames are permanent and cannot be changed.
      </p>
    </div>
  );
});

const PasswordDialog = memo(function PasswordDialog({
  profile: _profile,
}: {
  profile: UserMeResponseDto;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  return (
    <Card className="border-border/40 py-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" aria-hidden="true" />
          Password &amp; Security
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" aria-label="Change account password">
              <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and a new password to update your
                credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Current */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((p) => ({
                        ...p,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowPassword((p) => ({ ...p, current: !p.current }))
                    }
                    aria-label={
                      showPassword.current
                        ? 'Hide current password'
                        : 'Show current password'
                    }
                  >
                    {showPassword.current ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowPassword((p) => ({ ...p, new: !p.new }))
                    }
                    aria-label={
                      showPassword.new ? 'Hide new password' : 'Show new password'
                    }
                  >
                    {showPassword.new ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters.
                </p>
              </div>

              {/* Confirm */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowPassword((p) => ({ ...p, confirm: !p.confirm }))
                    }
                    aria-label={
                      showPassword.confirm
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showPassword.confirm ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (
                    passwordData.newPassword !== passwordData.confirmPassword
                  ) {
                    alert('Passwords do not match!');
                    return;
                  }
                  if (passwordData.newPassword.length < 8) {
                    alert('Password must be at least 8 characters!');
                    return;
                  }

                  setOpen(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
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
      displayName: (profile.displayName ?? '') as string,
      bio: (profile.bio ?? '') as string,
      pronouns: ((profile as unknown as Record<string, unknown>).pronouns as string | undefined) ?? '',
      location: ((profile as unknown as Record<string, unknown>).location as string | undefined) ?? '',
      websiteUrl: ((profile as unknown as Record<string, unknown>).websiteUrl as string | undefined) ?? '',
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
        title: 'Profile saved',
        body: 'Your changes have been saved.',
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
        bio: values.bio || null,
        avatarPublicId: values.avatarPublicId ?? null,
      });
    },
    [updateProfile],
  );

  if (!profile || !defaultValues) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const { formState } = form;
  const isSaving = formState.isSubmitting || updateProfile.isPending;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Error banner */}
        <FormErrorBanner
          lastError={
            updateProfile.lastError
              ? {
                  ...updateProfile.lastError,
                  code: updateProfile.lastApiError?.code ?? 'GLOBAL_UNKNOWN',
                }
              : null
          }
          onDismiss={updateProfile.resetError}
        />

        {/* Avatar */}
        <AvatarSection
          profile={profile}
          displayName={profile.displayName ?? profile.username}
          isSaving={isSaving}
          form={form}
        />

        {/* Account info */}
        <Card className="border-border/40 py-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" aria-hidden="true" />
              Account Information
            </CardTitle>
            <CardDescription>
              Manage your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="w-4 h-4" aria-hidden="true" />
                Display Name
              </Label>
              <Input
                id="displayName"
                {...form.register('displayName')}
                disabled={isSaving}
                className="bg-background/50"
                aria-describedby={
                  form.formState.errors.displayName
                    ? 'displayName-error'
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

            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <AtSign className="w-4 h-4" aria-hidden="true" />
                Username
              </Label>
              <UsernameField username={profile.username} disabled={isSaving} />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                disabled
                className="bg-muted/50"
                aria-label="Email address (read-only)"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email address.
              </p>
            </div>

            {/* Save button */}
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
                className="gap-2"
                aria-label="Save account changes"
              >
                {isSaving && (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password section (unchanged) */}
        <PasswordDialog profile={profile} />
      </form>
    </FormProvider>
  );
});
