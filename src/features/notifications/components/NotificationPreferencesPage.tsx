"use client";

/**
 * `NotificationPreferencesPage.tsx` — full notification preferences page.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.F2.
 *
 * The preferences page composes the `NotificationPreferencesForm`
 * inside a page-level layout. A back link returns to the notification
 * center. The page is gated by the `phase5_notifications` feature
 * flag — when set to `'placeholder'`, it renders
 * `NotificationPlaceholder`.
 *
 * ## Metadata
 *
 * The page does not embed user data in any visible HTML before the
 * preferences are fetched, so no metadata leakage risk exists. The
 * page title is set to "Notification preferences" so the tab/SEO
 * title remains a stable string.
 */

import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useNotificationFeatureFlag } from "@/features/notifications/hooks";
import {
  NotificationPreferencesForm,
  NotificationPlaceholder,
} from "@/features/notifications/components";

export interface NotificationPreferencesPageProps {
  className?: string;
}

export function NotificationPreferencesPage({
  className,
}: NotificationPreferencesPageProps) {
  const { isPlaceholder } = useNotificationFeatureFlag();

  return (
    <div
      className={cn(
        "min-h-screen bg-transparent text-foreground",
        className,
      )}
      data-testid="notification-preferences-page"
    >
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" aria-label="Back to notifications">
            <Link href="/notifications">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
          </Button>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Notification preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how and when you&apos;d like to receive updates.
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-12 max-w-4xl mx-auto">
        {isPlaceholder ? (
          <NotificationPlaceholder className="py-12" />
        ) : (
          <NotificationPreferencesForm />
        )}
      </main>
    </div>
  );
}