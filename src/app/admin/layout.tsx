import type React from "react";
import type { Metadata } from "next";
import { createInterFont } from "@/shared/config/fonts";
import { AdminLayoutShell } from "./_components";
import "@/app/globals.css";

const inter = createInterFont();

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AdminLayoutShell>{children}</AdminLayoutShell>
      </body>
    </html>
  );
}
