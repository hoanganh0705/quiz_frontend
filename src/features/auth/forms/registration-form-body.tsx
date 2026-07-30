'use client';

/**
 * `RegistrationFormBody` — the form layout that replaces the
 * hand-rolled schema in `app/(public)/signup/page.tsx`. Wraps the
 * existing visual frame (left visual, right form, password-strength
 * UI) with:
 *
 *   - the new `register.schema` from `./schemas/register.schema.ts`
 *     (TKT-2.1.D1) — constraints derived from the backend's
 *     `RegisterDto`;
 *   - the new `useRegistrationSubmit` hook (TKT-2.1.D2) — single-flight
 *     and button disable;
 *   - the existing `mapRegisterError` (TKT-2.1.B2) — surfaced via
 *     `useRegistrationSubmit.state`; the `errorKind` is the only
 *     thing rendered;
 *   - the new `registration-copy` registry (TKT-2.1.B3) — every
 *     user-facing string resolves through copy keys.
 *
 * Anti-enumeration discipline is enforced by reading only `errorKind`
 * from the submit handler (never `errorMessage` or a raw `ApiError`)
 * and by rendering copy keys without interpolation.
 *
 * The component intentionally replaces the page's hand-rolled schema.
 * The original page's submit path (`auth.wrapper.register`) is no
 * longer reachable from the form; that export is removed in
 * TKT-2.1.E2 once the wrapper is migrated.
 */

import { useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useToggle } from '@/shared/hooks';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';

import { getPasswordStrength } from '@/features/auth/utils/password-strength';
import { SignupAvailabilityStrip } from '@/features/auth/forms/signup-availability-strip';
import {
  registerSchema,
  type RegisterFormValues,
} from '@/features/auth/forms/schemas/register.schema';
import { useRegistrationSubmit } from '@/features/auth/forms/use-registration-submit';
import {
  COPY_KEYS,
  registrationCopy,
  resolveCopy,
} from '@/features/auth/copy/registration-copy';

export function RegistrationFormBody() {
  const [showPassword, toggleShowPassword] = useToggle(false);
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false);
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
      username: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      agreeToTerms: false,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const passwordValue = watch('password');
  const emailValue = watch('email');
  const usernameValue = watch('username');

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwordValue ?? ''),
    [passwordValue]
  );

  // After the submit resolves, route or render the error. The state
  // machine owns the lifecycle of error rendering; the form layer
  // never inspects raw `ApiError`.
  useEffect(() => {
    if (state.status === 'success') {
      router.replace(state.nextRoute);
    }
  }, [state, router]);

  // Surface mapper-returned field errors into react-hook-form so the
  // existing field-level error UI lights up.
  useEffect(() => {
    if (state.status !== 'error') return;
    const fieldErrors = state.result.fieldErrors;
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (typeof message !== 'string') continue;
      const knownField = (['username', 'email', 'password'] as const).find(
        (key) => key === field
      );
      if (!knownField) continue;
      setError(knownField, {
        type: 'server',
        message,
      });
    }
  }, [state, setError]);

  const onSubmit = useCallback(
    (values: RegisterFormValues) => {
      void start(values);
    },
    [start]
  );

  // Reset the submit state when the user starts editing after an
  // error. Otherwise a stale `'error'` UI flashes after they retype
  // a corrected value.
  useEffect(() => {
    if (state.status !== 'error') return;
    const subscription = watch(() => reset());
    return () => subscription.unsubscribe();
  }, [state.status, watch, reset]);

  const submitDisabled =
    state.status === 'pending' || state.status === 'success';

  // The single global error copy is rendered from copy keys only;
  // never from a server-supplied string. `errorKind` is the only
  // signal surfaced.
  const globalCopyKey = ((): string => {
    if (state.status !== 'error') return '';
    switch (state.result.errorKind) {
      case 'validation':
        return COPY_KEYS.submit.error.validation;
      case 'rate_limited':
        return COPY_KEYS.submit.error.rate_limited;
      case 'server':
        return COPY_KEYS.submit.error.server;
      case 'forbidden':
        return COPY_KEYS.submit.error.forbidden;
    }
  })();

  return (
    <main className='min-h-screen flex bg-background'>
      {/* Left Side - Visual */}
      <div className='hidden lg:flex lg:w-1/2 relative overflow-hidden p-2'>
        <div className='relative w-full h-full rounded-2xl overflow-hidden'>
          <Image
            src='/login.jpg'
            alt='QuizHub signup - Join our community of quiz enthusiasts'
            fill
            className='object-cover'
            priority
          />
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-8 py-12'>
        <div className='w-full max-w-md space-y-10'>
          {/* Mobile Logo */}
          <div className='lg:hidden flex items-center justify-center gap-3'>
            <h1 className='text-2xl font-bold text-foreground'>QuizHub</h1>
          </div>

          {/* Header */}
          <div className='space-y-10'>
            <h2 className='text-3xl font-bold text-foreground'>
              Create your account
            </h2>
            <p className='text-sm text-muted-foreground'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-foreground hover:text-muted-foreground font-semibold transition-colors underline'
              >
                Sign in
              </Link>
            </p>
            <p className='text-xs text-muted-foreground'>
              After signing up, we will email you a verification link.{' '}
              <Link
                href='/resend-verification'
                className='text-foreground hover:text-muted-foreground font-medium transition-colors underline'
              >
                Resend verification email
              </Link>
            </p>
          </div>

          <div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='space-y-5'
              aria-label='Create a new account'
              aria-live='polite'
              data-testid='registration-form'
            >
              {/* Username */}
              <div className='space-y-2'>
                <Label htmlFor='username'>
                  {resolveCopy(COPY_KEYS.form.username.label)}
                </Label>
                <Input
                  id='username'
                  type='text'
                  placeholder={resolveCopy(
                    COPY_KEYS.form.username.placeholder
                  )}
                  autoComplete='username'
                  {...register('username')}
                  className='h-12 text-primary'
                  aria-invalid={!!errors.username}
                />
                <p className='text-xs text-muted-foreground'>
                  {resolveCopy(COPY_KEYS.form.username.help)}
                </p>
                {errors.username && (
                  <p className='text-xs text-destructive'>
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <Label htmlFor='email'>
                  {resolveCopy(COPY_KEYS.form.email.label)}
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder={resolveCopy(
                    COPY_KEYS.form.email.placeholder
                  )}
                  autoComplete='email'
                  {...register('email')}
                  className='h-12 text-primary'
                  aria-invalid={!!errors.email}
                />
                <p className='text-xs text-muted-foreground'>
                  {resolveCopy(COPY_KEYS.form.email.help)}
                </p>
                {errors.email && (
                  <p className='text-xs text-destructive'>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className='space-y-2'>
                <Label htmlFor='password'>
                  {resolveCopy(COPY_KEYS.form.password.label)}
                </Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder={resolveCopy(
                      COPY_KEYS.form.password.placeholder
                    )}
                    autoComplete='new-password'
                    {...register('password')}
                    className='h-12 pr-12 text-primary'
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type='button'
                    onClick={toggleShowPassword}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className='w-5 h-5' aria-hidden='true' />
                    ) : (
                      <Eye className='w-5 h-5' aria-hidden='true' />
                    )}
                  </button>
                </div>
                {passwordValue && (
                  <div className='space-y-2' aria-live='polite'>
                    <div
                      className='grid grid-cols-4 gap-1'
                      role='progressbar'
                      aria-label='Password strength'
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-valuenow={passwordStrength.score}
                    >
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-1.5 rounded-full ${
                            index < passwordStrength.score
                              ? 'bg-brand'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className='text-xs text-destructive'>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className='space-y-2'>
                <Label htmlFor='passwordConfirmation'>
                  {resolveCopy(COPY_KEYS.form.passwordConfirmation.label)}
                </Label>
                <div className='relative'>
                  <Input
                    id='passwordConfirmation'
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={resolveCopy(
                      COPY_KEYS.form.passwordConfirmation.placeholder
                    )}
                    autoComplete='new-password'
                    {...register('passwordConfirmation')}
                    className='h-12 pr-12 text-primary'
                    aria-invalid={!!errors.passwordConfirmation}
                  />
                  <button
                    type='button'
                    onClick={toggleShowConfirmPassword}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-5 h-5' aria-hidden='true' />
                    ) : (
                      <Eye className='w-5 h-5' aria-hidden='true' />
                    )}
                  </button>
                </div>
                {errors.passwordConfirmation && (
                  <p className='text-xs text-destructive'>
                    {errors.passwordConfirmation.message}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className='space-y-2'>
                <div className='flex items-start gap-2'>
                  <Controller
                    name='agreeToTerms'
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id='terms'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='text-brand mt-0.5'
                      />
                    )}
                  />
                  <Label
                    htmlFor='terms'
                    className='text-xs text-muted-foreground cursor-pointer select-none leading-relaxed'
                  >
                    I agree to the{' '}
                    <Link
                      href='/terms'
                      className='text-foreground hover:text-muted-foreground transition-colors underline'
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href='/privacy'
                      className='text-foreground hover:text-muted-foreground transition-colors underline'
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className='text-xs text-destructive'>
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>

              {/* Global submit error */}
              {state.status === 'error' && globalCopyKey ? (
                <p
                  className='text-xs text-destructive'
                  data-testid='registration-error'
                  aria-live='assertive'
                >
                  {resolveCopy(globalCopyKey) ||
                    registrationCopy.submit.error.globalFallback}
                </p>
              ) : null}

              {/* Submit button */}
              <Button
                type='submit'
                disabled={submitDisabled}
                size='lg'
                className='w-full h-12 font-semibold rounded-xl'
                data-testid='registration-submit'
              >
                {state.status === 'pending' ? (
                  <div
                    className='flex items-center gap-2'
                    role='status'
                    aria-live='polite'
                  >
                    <div
                      className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin text-white'
                      aria-hidden='true'
                    />
                    Creating account…
                  </div>
                ) : (
                  <p className='text-white'>Create account</p>
                )}
              </Button>
            </form>

            {/* Availability strip (TKT-2.1.C5, additive) */}
            <div
              className='mt-2 flex flex-col gap-1'
              data-testid='signup-availability-strip'
            >
              <SignupAvailabilityStrip
                email={emailValue ?? ''}
                username={usernameValue ?? ''}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
