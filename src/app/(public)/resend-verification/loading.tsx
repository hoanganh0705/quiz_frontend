import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";

export default function ResendVerificationLoading() {
  return <AuthCardSkeleton testId="resend-verification-skeleton" rows={1} />;
}
