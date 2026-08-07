"use client";

/**
 * `TournamentRegistrationCta` — registration action button for tournament detail.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.D1.
 *
 * ## Purpose
 *
 * Renders the primary registration action button (Register or Withdraw) with
 * correct state visibility, disabled states during mutation, error banner,
 * and withdrawal confirmation dialog. The CTA reflects server-authoritative
 * state — it is shown only when the server indicates the user is eligible
 * and registration is open.
 *
 * ## States
 *
 * 1. **Unauthenticated**: "Sign in to register" button triggers auth flow
 * 2. **Eligible (not registered)**: "Register" button enabled
 * 3. **Registered**: "Withdraw" button (with confirmation dialog)
 * 4. **Ineligible**: nothing rendered
 * 5. **Registration closed**: nothing rendered
 * 6. **Pending**: button disabled with spinner
 * 7. **Error**: error banner with retry affordance
 */

import { useCallback, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
  useTournamentRegistration,
  type UseTournamentRegistrationResult,
} from "@/features/tournaments/hooks";
import {
  RegistrationErrorBanner,
} from "@/features/tournaments/components/shared/RegistrationErrorBanner";
import { WithdrawDialog } from "@/features/tournaments/components/shared/WithdrawDialog";

export interface TournamentRegistrationCtaProps {
  /** Tournament ID. */
  tournamentId: string;
  /** Tournament name for display in dialog. */
  tournamentName?: string;
  /** Custom className for the CTA wrapper. */
  className?: string;
}

/**
 * Map participation state to CTA visibility and label.
 */
function getCtaState(params: {
  isAuthenticated: boolean;
  isLoading: boolean;
  isRegistered: boolean;
  isEligible: boolean;
  registerState: UseTournamentRegistrationResult["registerState"];
  withdrawState: UseTournamentRegistrationResult["withdrawState"];
}): {
  variant: "signIn" | "register" | "withdraw" | "none";
  disabled: boolean;
  pending: boolean;
} {
  const { isAuthenticated, isLoading, isRegistered, isEligible, registerState, withdrawState } = params;

  // Still loading participation data
  if (isLoading) {
    return { variant: "none", disabled: true, pending: false };
  }

  // Not authenticated
  if (!isAuthenticated) {
    return { variant: "signIn", disabled: false, pending: false };
  }

  // Ineligible
  if (!isEligible) {
    return { variant: "none", disabled: false, pending: false };
  }

  // Registered: show withdraw
  if (isRegistered) {
    const isPending = withdrawState === "pending";
    return { variant: "withdraw", disabled: isPending, pending: isPending };
  }

  // Not registered: show register
  const isPending = registerState === "pending";
  return { variant: "register", disabled: isPending, pending: isPending };
}

/**
 * The tournament registration action button.
 */
export function TournamentRegistrationCta({
  tournamentId,
  tournamentName,
  className,
}: TournamentRegistrationCtaProps) {
  // Feature flag check
  const flagValue = getFeatureFlagValue("phase5_tournaments");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Auth state
  const { bootstrapState } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";

  const {
    isRegistered,
    isEligible,
    isLoading,
    register,
    withdraw,
    registerState,
    withdrawState,
    registerError,
    withdrawError,
    reset,
  } = useTournamentRegistration(tournamentId);

  // Dialog open state for withdraw confirmation
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  // Determine CTA state
  const ctaState = useMemo(() => {
    return getCtaState({
      isAuthenticated,
      isLoading,
      isRegistered,
      isEligible,
      registerState,
      withdrawState,
    });
  }, [isAuthenticated, isLoading, isRegistered, isEligible, registerState, withdrawState]);

  // Current error to display (from the pending mutation)
  const currentError =
    registerState === "error"
      ? registerError
      : withdrawState === "error"
        ? withdrawError
        : null;

  // Handlers
  const handleSignIn = useCallback(() => {
    // Redirect to sign-in with return URL preserved
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/sign-in?returnUrl=${returnUrl}`;
  }, []);

  const handleRegister = useCallback(async () => {
    await register();
  }, [register]);

  const handleWithdrawClick = useCallback(() => {
    setShowWithdrawDialog(true);
  }, []);

  const handleWithdrawConfirm = useCallback(async () => {
    setShowWithdrawDialog(false);
    await withdraw();
  }, [withdraw]);

  const handleWithdrawCancel = useCallback(() => {
    setShowWithdrawDialog(false);
  }, []);

  const handleDismissError = useCallback(() => {
    reset();
  }, [reset]);

  // Feature flag off: render nothing
  if (isFlagPlaceholder) {
    return null;
  }

  // No CTA to render (still loading or ineligible)
  if (ctaState.variant === "none") {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Error banner */}
      {currentError && (
        <RegistrationErrorBanner
          error={currentError}
          onDismiss={handleDismissError}
        />
      )}

      {/* CTA button */}
      {ctaState.variant === "signIn" && (
        <Button
          variant="default"
          size="lg"
          onClick={handleSignIn}
          className="w-full"
          data-testid="tournament-cta-sign-in"
        >
          Sign in to register
        </Button>
      )}

      {ctaState.variant === "register" && (
        <Button
          variant="default"
          size="lg"
          onClick={handleRegister}
          disabled={ctaState.disabled}
          className="w-full"
          data-testid="tournament-cta-register"
        >
          {ctaState.pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Registering...
            </>
          ) : (
            "Register"
          )}
        </Button>
      )}

      {ctaState.variant === "withdraw" && (
        <Button
          variant="outline"
          size="lg"
          onClick={handleWithdrawClick}
          disabled={ctaState.disabled}
          className="w-full border-destructive text-destructive hover:bg-destructive/10"
          data-testid="tournament-cta-withdraw"
        >
          {ctaState.pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Withdrawing...
            </>
          ) : (
            "Withdraw"
          )}
        </Button>
      )}

      {/* Withdraw confirmation dialog */}
      <WithdrawDialog
        open={showWithdrawDialog}
        tournamentName={tournamentName}
        onConfirm={handleWithdrawConfirm}
        onCancel={handleWithdrawCancel}
        loading={withdrawState === "pending"}
      />
    </div>
  );
}
