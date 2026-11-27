"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import {
  ADMIN_ROUTE_LABELS,
  isRoutableAdminBreadcrumbPath,
} from "@/features/admin/config/admin-nav-registry";

import { cn } from "@/shared/utils/merge-class-names";

function labelFor(segment: string): string {
  return ADMIN_ROUTE_LABELS[segment] ?? segment;
}

export function AdminBreadcrumb() {
  const pathname = usePathname() ?? "/admin";

  const segments = pathname
    .split("?")[0]!
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "admin");

  const prefix = "/admin";

  return (
    <nav
      aria-label="Admin breadcrumb"
      data-testid="admin-breadcrumb"
      className={cn("flex items-center gap-1 text-sm text-muted-foreground")}
    >
      <Link
        href={prefix}
        className="hover:text-foreground"
        data-testid="admin-breadcrumb-root-link"
      >
        Admin
      </Link>
      {segments.map((segment, index) => {
        const href = `${prefix}/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = labelFor(segment);
        const routable = isRoutableAdminBreadcrumbPath(href);
        return (
          <Fragment key={href}>
            <ChevronRight
              className="h-3 w-3 shrink-0 text-muted-foreground/60"
              aria-hidden="true"
            />
            {isLast ? (
              <span
                aria-current="page"
                data-testid="admin-breadcrumb-current"
                className="font-medium text-foreground"
              >
                {label}
              </span>
            ) : routable ? (
              <Link
                href={href}
                className="hover:text-foreground"
                data-testid="admin-breadcrumb-link"
              >
                {label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
