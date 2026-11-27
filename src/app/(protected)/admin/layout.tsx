import { AdminLayoutShell } from "@/features/admin/components/AdminLayoutShell";

import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard — QuizHub",
    template: "%s — QuizHub Admin",
  },
  description: "QuizHub administration and management dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
