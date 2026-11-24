import { ShieldAlert } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

export interface SelfRoleRevokeForbiddenNoticeProps {
  className?: string;
}

export function SelfRoleRevokeForbiddenNotice({
  className,
}: SelfRoleRevokeForbiddenNoticeProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4",
        className,
      )}
      data-testid="self-role-revoke-forbidden-notice"
      role="alert"
      aria-live="polite"
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-destructive"
      />
      <div className="space-y-1">
        <p className="text-sm font-bold text-destructive">
          Self-Revocation Prohibited
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Revoking your own admin role would immediately revoke your administrative privileges. This action is restricted to other super administrators.
        </p>
      </div>
    </div>
  );
}
