import type React from "react";
import type { Metadata } from "next";
import { AdminLayoutShell } from "./_components";

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
return (
<>
<a href="#main-content" className="skip-link">
Skip to main content
      </a>
<AdminLayoutShell>{children}</AdminLayoutShell>
</>
  );
}
