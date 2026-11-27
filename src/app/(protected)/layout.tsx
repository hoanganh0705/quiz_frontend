import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasUsableSession } from "@/features/auth/utils/auth-cookies";

import { ProtectedShell } from "./_components/ProtectedShell";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function extractRequestedPath(headerStore: Headers): string | null {
  const candidates = [
    headerStore.get("x-pathname"),
    headerStore.get("next-url"),
    headerStore.get("x-invoke-path"),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
  }
  return null;
}

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerStore = await headers();
  const request = new Request("http://internal", {
    headers: headerStore,
  });

  if (!hasUsableSession(request)) {
    const requestedPath = extractRequestedPath(headerStore);
    redirect(
      requestedPath
        ? `/login?redirect=${encodeURIComponent(requestedPath)}`
        : "/login",
    );
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
