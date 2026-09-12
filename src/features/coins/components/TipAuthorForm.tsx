"use client";

import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";

import { COIN_SPEND_AMOUNTS } from "@/features/coins/constants/coin.constants";
import { useTipAuthor } from "@/features/coins/hooks/useTipAuthor";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog";

export interface TipAuthorFormProps {
  currentBalance: number | null;
  isPlaceholder: boolean;
}

const INTEGER_FORMAT = new Intl.NumberFormat("en-US");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `<TipAuthorForm />` — Phase 5.2 spend form.
 *
 * Wraps the existing `useTipAuthor` mutation in a small UX so users can
 * tip without leaving `/coins`. We do NOT do a recipient-username
 * search here — that lives in `/friends`. The user pastes the recipient
 * user UUID (the same identifier they see in profile URLs) and
 * optionally a quiz id + a short thank-you message.
 *
 * On confirm we delegate to `useTipAuthor().tip(...)` with an
 * idempotency key derived from the recipient + quiz so a network retry
 * does not double-charge.
 */
export function TipAuthorForm({
  currentBalance,
  isPlaceholder,
}: TipAuthorFormProps): React.ReactElement {
  const { currentUser } = useAuth();
  const cost = COIN_SPEND_AMOUNTS.TIP_STANDARD;
  const { tip, isPending, error } = useTipAuthor();

  const recipientId = useId();
  const quizId = useId();
  const messageId = useId();

  const [recipientUserId, setRecipientUserId] = useState("");
  const [quizIdValue, setQuizIdValue] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSelfTip =
    currentUser !== null &&
    recipientUserId.trim().length > 0 &&
    recipientUserId.trim() === currentUser.userId;

  const insufficient = currentBalance !== null && currentBalance < cost;

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setValidationError(null);
  }, []);

  const handleSubmit = useCallback((): void => {
    const trimmedRecipient = recipientUserId.trim();
    if (!UUID_PATTERN.test(trimmedRecipient)) {
      setValidationError("Recipient must be a UUID (e.g. 0d8e3a45-…).");
      return;
    }
    if (currentUser !== null && trimmedRecipient === currentUser.userId) {
      setValidationError("You can't tip yourself.");
      return;
    }
    if (quizIdValue.trim().length > 0 && !UUID_PATTERN.test(quizIdValue.trim())) {
      setValidationError("Quiz id, if provided, must be a UUID.");
      return;
    }
    setValidationError(null);
    tip(
      {
        recipientUserId: trimmedRecipient,
        ...(quizIdValue.trim().length > 0
          ? { quizId: quizIdValue.trim() }
          : {}),
        ...(message.trim().length > 0 ? { message: message.trim() } : {}),
      },
      `tip:${currentUser?.userId ?? "anon"}:${trimmedRecipient}:${quizIdValue.trim() || "no-quiz"}`,
    );
    setOpen(false);
  }, [
    recipientUserId,
    currentUser,
    quizIdValue,
    message,
    tip,
  ]);

  const disabledReason = isPlaceholder
    ? "Coin spend is in preview mode."
    : currentUser === null
      ? "Sign in to send a tip."
      : isSelfTip
        ? "You can't tip yourself."
        : insufficient
          ? `You need at least ${INTEGER_FORMAT.format(cost)} coins to send a tip.`
          : null;

  const confirmDisabled = disabledReason !== null;

  return (
    <Card data-testid="tip-author-form-card">
      <CardContent className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Send {INTEGER_FORMAT.format(cost)} coins to another user as a thank-you.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={recipientId}>Recipient user id (UUID)</Label>
          <Input
            id={recipientId}
            type="text"
            placeholder="0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b"
            value={recipientUserId}
            onChange={(event) => setRecipientUserId(event.target.value)}
            disabled={isPlaceholder}
            data-testid="tip-recipient-input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={quizId}>Quiz id (optional, UUID)</Label>
          <Input
            id={quizId}
            type="text"
            placeholder="e.g. 0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a"
            value={quizIdValue}
            onChange={(event) => setQuizIdValue(event.target.value)}
            disabled={isPlaceholder}
            data-testid="tip-quiz-input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={messageId}>Message (optional)</Label>
          <Textarea
            id={messageId}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Thanks for the great quiz!"
            disabled={isPlaceholder}
            rows={3}
            data-testid="tip-message-input"
          />
        </div>

        {validationError ? (
          <p
            className="text-xs text-rose-600 dark:text-rose-300"
            data-testid="tip-validation-error"
            role="alert"
          >
            {validationError}
          </p>
        ) : null}

        {disabledReason ? (
          <p className="text-xs text-muted-foreground" data-testid="tip-disabled-reason">
            {disabledReason}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => handleOpenChange(true)}
            disabled={confirmDisabled}
            data-testid="tip-submit-button"
          >
            Send {INTEGER_FORMAT.format(cost)} coins
          </Button>
        </div>

        <PurchaseConfirmDialog
          open={open}
          onOpenChange={handleOpenChange}
          onConfirm={handleSubmit}
          title="Send a tip"
          body={`This will deduct ${INTEGER_FORMAT.format(cost)} coins from your balance and credit the recipient.`}
          confirmLabel={`Send ${INTEGER_FORMAT.format(cost)} coins`}
          cost={cost}
          detail={
            recipientUserId.trim().length > 0 ? recipientUserId.trim() : null
          }
          isPending={isPending}
          error={error}
          currentBalance={currentBalance}
        />
      </CardContent>
    </Card>
  );
}
