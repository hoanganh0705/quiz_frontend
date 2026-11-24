"use client";

import { Clock, Mail, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";

export function SupportContactInfo(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Primary Channels Card */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
          Direct Channels
        </h3>

        <div className="space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </p>
              <a
                href="mailto:support@quizhub.com"
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                support@quizhub.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Response SLA
              </p>
              <p className="text-sm font-medium text-foreground">
                Under 4 hours
              </p>
              <p className="text-xs text-muted-foreground">
                Monday – Friday, 9am – 6pm EST
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Account Security
              </p>
              <p className="text-xs text-muted-foreground">
                We will never ask for your password or secret keys.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Community Card */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-primary uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Need Instant Help?</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Most account, coin, and tournament questions are answered instantly in our Frequently Asked Questions section.
        </p>
      </div>
    </div>
  );
}
