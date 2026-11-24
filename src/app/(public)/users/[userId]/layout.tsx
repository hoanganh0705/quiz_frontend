import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/shared/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;

  return buildMetadata({
    title: "User Profile | QuizHub",
    description: "View user profile, achievements, and quizzes on QuizHub.",
    path: `/users/${userId}`,
  });
}

export default async function UserLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ userId: string }>;
}) {
  await params;
  return <>{children}</>;
}
