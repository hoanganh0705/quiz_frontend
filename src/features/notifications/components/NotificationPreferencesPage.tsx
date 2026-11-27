"use client";

import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { NotificationPreferencesForm } from "@/features/notifications/components";

export interface NotificationPreferencesPageProps {
  className?: string;
}

export function NotificationPreferencesPage({
  className,
}: NotificationPreferencesPageProps) {

  return (
    <div
      className={cn("min-h-screen bg-transparent text-foreground", className)}
      data-testid="notification-preferences-page"
    >
      <header className="w-full px-4 md:px-8 lg:px-12 pt-4 md:pt-8 lg:pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            aria-label="Back to notifications"
          >
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

      <main className="w-full px-4 md:px-8 lg:px-12 pb-12">
        <NotificationPreferencesForm />
      </main>
    </div>
  );
}
