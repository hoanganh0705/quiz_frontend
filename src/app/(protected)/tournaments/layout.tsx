import type { ReactNode } from "react";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Tournaments | QuizHub",
  description: "Compete in quiz tournaments and win rewards.",
  path: "/tournaments",
});

export default function TournamentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
