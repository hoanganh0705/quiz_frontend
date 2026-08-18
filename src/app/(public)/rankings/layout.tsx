import type { ReactNode } from "react";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
title: "Rankings | QuizHub",
description:
"Track your personal rank, milestones, and the global quiz leaderboard.",
path: "/rankings",
});

export default function RankingsLayout({
children,
}: {
children: ReactNode;
}) {
return children;
}