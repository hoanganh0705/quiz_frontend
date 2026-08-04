import type { ReactNode } from "react";
import { buildMetadata } from "@/shared/lib/seo";

/**
 * `/achievements` — Story 5.5 achievement surfaces route layout.
 *
 * Owns metadata and delegates rendering to the client page component.
 */
export const metadata = buildMetadata({
  title: "Achievements | QuizHub",
  description:
    "Browse the badge catalog, your earned badges, and your full achievement history.",
  path: "/achievements",
});

export default function AchievementsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}