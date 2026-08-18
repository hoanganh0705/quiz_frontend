"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export interface InsufficientCoinsNoticeProps {

required?: number | null;

currentBalance?: number | null;
className?: string;
}

export function InsufficientCoinsNotice({
required,
currentBalance,
className,
}: InsufficientCoinsNoticeProps) {
return (
<div
role="alert"
data-testid="insufficient-coins-notice"
className={`flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground ${className ?? ""}`}
    >
<AlertCircle
className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
aria-hidden="true"
      />
<div className="flex-1 space-y-1">
<p className="font-semibold text-destructive">Not enough coins</p>
<p className="text-xs text-muted-foreground">
{required !== undefined && required !== null
? `This action costs ${required.toLocaleString("en-US")} coins`
: "You don't have enough coins"}
{currentBalance !== undefined && currentBalance !== null
? ` and your wallet currently holds ${currentBalance.toLocaleString("en-US")}.`
: "."}
</p>
<p className="text-xs text-muted-foreground">
Earn more by completing quizzes, finishing daily challenges, or
          climbing tournament brackets.{" "}
<Link
href="/coins"
className="font-medium text-brand underline-offset-4 hover:underline"
          >
View your coin ledger
          </Link>
.
        </p>
</div>
</div>
  );
}