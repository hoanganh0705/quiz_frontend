"use client";

import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

import type { RankingInconsistencyDto } from "../ranking-admin-types";

export interface RankingInconsistencyTableProps {
  inconsistencies: RankingInconsistencyDto[];
  isLoading?: boolean;
}

function EmptyState() {
  return (
    <div
      data-testid="ranking-inconsistency-empty-state"
      role="status"
      className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 dark:bg-success/15 p-4"
    >
      <CheckCircle2
        className="h-5 w-5 shrink-0 text-success"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-foreground">
        No inconsistencies found. Rankings are consistent.
      </p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  const norm = (severity || "medium").toLowerCase();
  if (norm === "critical" || norm === "high") {
    return (
      <Badge variant="destructive" className="capitalize text-xs font-semibold">
        {norm}
      </Badge>
    );
  }
  if (norm === "medium") {
    return (
      <span className="inline-flex items-center rounded-md border border-warning/35 bg-warning/10 dark:bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning capitalize">
        {norm}
      </span>
    );
  }
  return (
    <Badge variant="secondary" className="capitalize text-xs font-medium">
      {norm}
    </Badge>
  );
}

function formatIssueType(type?: string): string {
  if (!type) return "Unknown Issue";
  switch (type) {
    case "xp_mismatch":
      return "XP Mismatch";
    case "missing_rank":
      return "Missing Rank";
    case "rank_gap":
      return "Rank Gap";
    case "duplicate_rank":
      return "Duplicate Rank";
    default:
      return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i} data-testid="ranking-inconsistency-skeleton-row">
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-64" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function RankingInconsistencyTable({
  inconsistencies,
  isLoading = false,
}: RankingInconsistencyTableProps) {
  if (inconsistencies.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Issue Type</TableHead>
              <TableHead className="w-[100px]">Severity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right w-[160px]">Affected Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows />
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Issue Type</TableHead>
            <TableHead className="w-[100px]">Severity</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right w-[160px]">Affected Scope</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inconsistencies.map((item, index) => {
            const hasUser = Boolean(item.userId && item.userId !== "-");
            const issueType = item.type || item.field;
            const description = item.description || (typeof item.actual === "string" ? item.actual : undefined);
            const severity = item.severity || (typeof item.expected === "string" ? item.expected : undefined);

            return (
              <TableRow
                key={`${issueType}-${item.userId ?? "global"}-${index}`}
                data-testid="ranking-inconsistency-row"
              >
                <TableCell className="font-medium text-foreground">
                  {formatIssueType(issueType)}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={severity} />
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {description ?? "Discrepancy detected during consistency check"}
                </TableCell>
                <TableCell className="text-right">
                  {hasUser ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.userId}
                    </span>
                  ) : (
                    <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
                      System-wide
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
