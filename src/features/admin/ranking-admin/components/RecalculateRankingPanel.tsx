"use client";

import { useCallback, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { TypedConfirmDialog } from "@/features/admin/components/TypedConfirmDialog";

import { useRecalculateRanking } from "../hooks/useRecalculateRanking";
import {
  RANKING_RECALCULATE_CONFIRM_KEY,
  RANKING_RECALCULATE_CONFIRM_STRING,
  RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE,
  RANKING_RECALCULATE_LABEL,
} from "../ranking-confirm-strings";

import { RankingCooldownNotice } from "./RankingCooldownNotice";
import { RankingJobStatusPanel } from "./RankingJobStatusPanel";

export interface RecalculateRankingPanelProps {
  initialScopeFilter?: string;
}

export function RecalculateRankingPanel({
  initialScopeFilter = "",
}: RecalculateRankingPanelProps): React.ReactElement {
  const [scopeFilter, setScopeFilter] = useState(initialScopeFilter);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { trigger, jobStatus, error, isRunning, cooldownRemaining } =
    useRecalculateRanking();

  const handleConfirm = useCallback(async () => {
    try {
      await trigger({ scopeFilter: scopeFilter || undefined });
    } catch {
      // Error is captured via the hook's `error` state. The dialog is
      // closed by the parent on the next state flush.
    } finally {
      setConfirmOpen(false);
    }
  }, [trigger, scopeFilter]);

  const isButtonDisabled = isRunning || cooldownRemaining !== null;

  return (
    <Card data-testid="recalculate-ranking-panel" className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            role="heading"
            aria-level={2}
            className="text-base font-semibold flex items-center gap-2"
          >
            <RefreshCw className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {RANKING_RECALCULATE_LABEL}
          </CardTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            Maintenance
          </Badge>
        </div>
        <CardDescription>
          Recompute all ranking scores based on the latest quiz attempts.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Scope filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="recalculate-scope-filter">Scope filter</Label>
          <Input
            id="recalculate-scope-filter"
            aria-describedby="recalculate-scope-filter-desc"
            data-testid="recalculate-scope-filter-input"
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
            placeholder="Optional period identifier (e.g. current_period)"
            autoComplete="off"
            spellCheck={false}
            disabled={isRunning}
          />
          <p
            id="recalculate-scope-filter-desc"
            className="text-xs text-muted-foreground"
          >
            Leave empty to recalculate all rankings. Invalid values are rejected
            with <code>INVALID_PERIOD</code>.
          </p>
        </div>

        {/* Cooldown notice */}
        <RankingCooldownNotice cooldownRemaining={cooldownRemaining} />

        {/* Trigger button */}
        <Button
          data-testid="recalculate-ranking-trigger-button"
          onClick={() => setConfirmOpen(true)}
          disabled={isButtonDisabled}
          className="self-start gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Recalculating…</span>
            </>
          ) : (
            "Recalculate Rankings"
          )}
        </Button>

        {/* Job status */}
        <RankingJobStatusPanel
          jobStatus={jobStatus}
          affectedUserCount={null}
          error={error}
          requestId={error?.requestId}
        />

        {/* Request ID banner on error */}
        {error ? <RequestIdBanner error={error} /> : null}
      </CardContent>

      {/* Typed-confirm dialog */}
      <TypedConfirmDialog
        open={confirmOpen}
        operation={RANKING_RECALCULATE_CONFIRM_KEY}
        expectedConfirmString={RANKING_RECALCULATE_CONFIRM_STRING}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        pending={isRunning}
        previousError={error}
      >
        <p
          data-testid="recalculate-ranking-irreversibility-notice"
          className="rounded-md border border-warning/30 bg-warning/10 dark:bg-warning/15 p-3 text-sm text-foreground"
        >
          {RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE}
        </p>
      </TypedConfirmDialog>
    </Card>
  );
}
