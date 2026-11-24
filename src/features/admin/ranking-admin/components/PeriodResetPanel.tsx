"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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

import { useResetRankingPeriod } from "../hooks/useResetRankingPeriod";
import {
  RANKING_RESET_CONFIRM_KEY,
  RANKING_RESET_CONFIRM_STRING,
  RANKING_RESET_IRREVERSIBILITY_NOTICE,
  RANKING_RESET_LABEL,
} from "../ranking-confirm-strings";

import { RankingCooldownNotice } from "./RankingCooldownNotice";
import { RankingCrossUserImpactWarning } from "./RankingCrossUserImpactWarning";
import { RankingJobStatusPanel } from "./RankingJobStatusPanel";

export interface PeriodResetPanelProps {
  initialPeriodIdentifier?: string;
}

export function PeriodResetPanel({
  initialPeriodIdentifier = "",
}: PeriodResetPanelProps): React.ReactElement {
  const [periodIdentifier, setPeriodIdentifier] = useState(
    initialPeriodIdentifier,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    trigger,
    jobStatus,
    affectedUserCount,
    error,
    isRunning,
    cooldownRemaining,
    showCrossUserWarning,
  } = useResetRankingPeriod({
    periodIdentifier: periodIdentifier || undefined,
  });

  const handleConfirm = useCallback(async () => {
    try {
      await trigger({
        periodIdentifier: periodIdentifier || undefined,
        confirmString: RANKING_RESET_CONFIRM_STRING,
      });
    } catch {
      // Error is captured via the hook's `error` state.
    } finally {
      setConfirmOpen(false);
    }
  }, [trigger, periodIdentifier]);

  const isButtonDisabled = isRunning || cooldownRemaining !== null;

  return (
    <Card
      data-testid="period-reset-panel"
      className="border-destructive/25 dark:border-destructive/30"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle
            role="heading"
            aria-level={2}
            className="text-base font-semibold text-destructive flex items-center gap-2"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {RANKING_RESET_LABEL}
          </CardTitle>
          <Badge variant="destructive" className="text-xs shrink-0">
            Destructive
          </Badge>
        </div>
        <CardDescription>
          Clear all rankings for a period. This is irreversible and affects
          every user.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Period selector */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="period-reset-period-input">Period identifier</Label>
          <Input
            id="period-reset-period-input"
            aria-describedby="period-reset-period-desc"
            data-testid="period-reset-period-input"
            value={periodIdentifier}
            onChange={(event) => setPeriodIdentifier(event.target.value)}
            placeholder="Period identifier (e.g. current, last, all)"
            autoComplete="off"
            spellCheck={false}
            disabled={isRunning}
          />
          <p
            id="period-reset-period-desc"
            className="text-xs text-muted-foreground"
          >
            Valid values: <code>current</code>, <code>last</code>,{" "}
            <code>all</code>. Invalid values are rejected with{" "}
            <code>INVALID_PERIOD</code>.
          </p>
        </div>

        {/* Cross-user impact warning */}
        {showCrossUserWarning ? (
          <RankingCrossUserImpactWarning affectedUserCount={affectedUserCount} />
        ) : null}

        {/* Cooldown notice */}
        <RankingCooldownNotice cooldownRemaining={cooldownRemaining} />

        {/* Trigger button */}
        <Button
          variant="destructive"
          data-testid="period-reset-trigger-button"
          onClick={() => setConfirmOpen(true)}
          disabled={isButtonDisabled}
          className="self-start gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Resetting…</span>
            </>
          ) : (
            "Reset Period"
          )}
        </Button>

        {/* Job status */}
        <RankingJobStatusPanel
          jobStatus={jobStatus}
          affectedUserCount={affectedUserCount}
          error={error}
          requestId={error?.requestId}
        />

        {/* Request ID banner on error */}
        {error ? <RequestIdBanner error={error} /> : null}
      </CardContent>

      {/* Typed-confirm dialog */}
      <TypedConfirmDialog
        open={confirmOpen}
        operation={RANKING_RESET_CONFIRM_KEY}
        expectedConfirmString={RANKING_RESET_CONFIRM_STRING}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        pending={isRunning}
        previousError={error}
      >
        <p
          data-testid="period-reset-irreversibility-notice"
          className="rounded-md border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 p-3 text-sm text-foreground"
        >
          {RANKING_RESET_IRREVERSIBILITY_NOTICE}
        </p>
      </TypedConfirmDialog>
    </Card>
  );
}
