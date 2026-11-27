import { AuthCardSkeleton } from "@/features/auth/components/auth-card-layout";

export default function ForgotPasswordLoading() {
  return <AuthCardSkeleton testId="forgot-password-skeleton" rows={1} />;
}
