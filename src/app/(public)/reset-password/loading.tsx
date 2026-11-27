import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";

export default function ResetPasswordLoading() {
  return <AuthCardSkeleton testId="reset-password-skeleton" rows={3} />;
}
