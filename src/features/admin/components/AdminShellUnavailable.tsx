"use client";

import type { ReactNode } from "react";

export interface AdminShellUnavailableProps {
  children: ReactNode;
}

export function AdminShellUnavailable({
  children,
}: AdminShellUnavailableProps) {
  return <>{children}</>;
}
