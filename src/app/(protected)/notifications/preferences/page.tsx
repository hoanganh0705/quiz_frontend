import { redirect } from "next/navigation";

/**
 * Notification preferences are canonically managed inside `/settings?tab=notifications`
 * via the single `NotificationPreferencesForm` backed by `/api/v1/notifications/preferences`.
 */
export default function NotificationPreferencesRoute(): never {
  redirect("/settings?tab=notifications");
}
