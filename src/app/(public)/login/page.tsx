"use client";

import { memo, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import Link from 'next/link'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToggle, useAsyncAction } from '@/shared/hooks'
import { useAuthState } from '@/features/auth/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/features/auth/wrappers/auth.wrapper'
import axios from 'axios'
import { useFetchCurrentUser } from '@/features/users/store/user-store'

// Hoist schema outside component (data-hoisting)
const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = memo(function LoginPage() {
  const [showPassword, toggleShowPassword] = useToggle(false);
  const { setAuthenticated } = useAuthState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifyBanner, setVerifyBanner] = useState<string | null>(null);
  const fetchCurrentUser = useFetchCurrentUser();

  const redirectTo = useMemo(
    () => searchParams.get("redirect") ?? "/quizzes",
    [searchParams],
  );
  // TKT-2.2.D4: visit `/login?verified=1` MUST render the same UI
  // as `/login`. The "Email verified successfully" banner was an
  // oracle — it asserted verification succeeded. The verify-email
  // page (TKT-2.2.C3) no longer navigates here with `?verified=1`,
  // so the banner is dead code; it is removed entirely.

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const { execute: onSubmit, isLoading } = useAsyncAction(
    async (data: LoginFormData) => {
      setVerifyBanner(null);
      try {
        // login() stores token automatically via setAuthToken in the wrapper
        await login({
          email: data.email,
          password: data.password
        })
        setAuthenticated(true)
        void fetchCurrentUser()
        router.replace(redirectTo)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const message =
            (err.response?.data as { message?: string })?.message ?? "";
          if (/verify|verified|verification/i.test(message)) {
            setVerifyBanner(
              "Your email is not verified yet. Please check your inbox or resend the link.",
            );
          }
        }
        throw err;
      }
    },
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Visual */}
      <aside
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-2"
        aria-label="Login background"
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <Image
            src="/login.jpg"
            alt="Login background"
            fill
            className="object-cover"
            priority
          />
        </div>
      </aside>

      {/* Right Side - Login Form */}
      <main className="w-full lg:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">QuizHub</h1>
          </div>

          {/* Header */}
          <header className="space-y-10">
            <h2 className="text-3xl font-bold text-foreground space-y-10">
              Welcome back!
            </h2>
            <p className="text-xs text-muted-foreground">
              New here?{" "}
              <Link
                href="/signup"
                className="text-foreground hover:text-muted-foreground font-semibold transition-colors underline"
              >
                Create an account
              </Link>
            </p>
          </header>

          <section aria-label="Login form">
            {/* TKT-2.2.D4: the `verified=1` banner was removed
                (it was an oracle). The login page is now
                intentionally neutral regardless of the URL. */}
            {verifyBanner && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {verifyBanner}
              </div>
            )}

            {/* Login Form */}
            <form
              onSubmit={handleSubmit((data) => onSubmit(data))}
              className="space-y-5"
              aria-label="Sign in to your account"
              aria-live="polite"
            >
              {/* Email Input */}
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  {...register("email")}
                  className="h-12 text-primary"
                  aria-invalid={!!errors.email}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className="h-12 pr-12 text-primary"
                    aria-invalid={!!errors.password}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="remember"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="text-brand"
                        disabled={isLoading}
                      />
                    )}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Keep me signed in
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-xs text-foreground hover:text-muted-foreground font-medium transition-colors underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="text-xs text-muted-foreground">
                Need a new verification link?{" "}
                <Link
                  href="/resend-verification"
                  className="text-foreground hover:text-muted-foreground font-medium transition-colors underline"
                >
                  Resend verification email
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full h-12 font-semibold rounded-xl"
              >
                {isLoading ? (
                  <div
                    className="flex items-center gap-2"
                    role="status"
                    aria-label="Signing in, please wait"
                  >
                    <div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    Signing in...
                  </div>
                ) : (
                  <p className="text-white">Sign in</p>
                )}
              </Button>
            </form>

            {/* Footer */}
            <footer className="text-xs text-center text-muted-foreground mt-8 leading-relaxed">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                className="text-foreground hover:text-muted-foreground transition-colors underline"
              >
                Terms
              </Link>
              {" & "}
              <Link
                href="/privacy"
                className="text-foreground hover:text-muted-foreground transition-colors underline"
              >
                Privacy Policy
              </Link>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
});

export default LoginPage;
