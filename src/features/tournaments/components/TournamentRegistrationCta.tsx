"use client";

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

tournamentId: string;

tournamentName?: string;

className?: string;
}

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

if (isLoading) {
return { variant: "none", disabled: true, pending: false };
  }

if (!isAuthenticated) {
return { variant: "signIn", disabled: false, pending: false };
  }

if (!isEligible) {
return { variant: "none", disabled: false, pending: false };
  }

if (isRegistered) {
const isPending = withdrawState === "pending";
return { variant: "withdraw", disabled: isPending, pending: isPending };
  }

const isPending = registerState === "pending";
return { variant: "register", disabled: isPending, pending: isPending };
}

export function TournamentRegistrationCta({
tournamentId,
tournamentName,
className,
}: TournamentRegistrationCtaProps) {

const flagValue = getFeatureFlagValue("tournaments_live");
const isFlagPlaceholder = flagValue === "placeholder";

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

const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

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

const currentError =
registerState === "error"
? registerError
: withdrawState === "error"
? withdrawError
: null;

const handleSignIn = useCallback(() => {

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

if (isFlagPlaceholder) {
return null;
  }

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
