import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";

export default function VerifyEmailLoading() {
  return <AuthCardSkeleton testId="verify-email-skeleton" rows={1} />;
}
