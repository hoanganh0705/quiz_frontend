"use client";

import * as React from "react";
import { Check, Copy, QrCode, Share2, Link as LinkIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InstanceQrCodeDialog } from "./InstanceQrCodeDialog";
import { cn } from "@/shared/utils/merge-class-names";

export interface InstanceShareCardProps {
  instanceId: string;
  quizTitle?: string | null;
  className?: string;
}

export function InstanceShareCard({
  instanceId,
  quizTitle,
  className,
}: InstanceShareCardProps) {
  const [isQrOpen, setIsQrOpen] = React.useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false);
  const [hasCopiedPin, setHasCopiedPin] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  // Short 8-character code for easy verbal sharing
  const roomCode = React.useMemo(() => {
    return instanceId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase();
  }, [instanceId]);

  // Absolute room URL
  const roomUrl = React.useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/instances/${instanceId}`;
    }
    return `/instances/${instanceId}`;
  }, [instanceId]);

  React.useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      setCanNativeShare(true);
    }
  }, []);

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(roomUrl);
        setHasCopiedUrl(true);
        setTimeout(() => setHasCopiedUrl(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyPin = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(roomCode);
        setHasCopiedPin(true);
        setTimeout(() => setHasCopiedPin(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (canNativeShare && navigator.share) {
      try {
        await navigator.share({
          title: quizTitle
            ? `Join Live Quiz: ${quizTitle}`
            : "Join QuizHub Live Battle",
          text: `Join my live quiz room on QuizHub! Room Code: ${roomCode}`,
          url: roomUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  return (
    <>
      <Card
        className={cn(
          "border border-border/80 bg-card/60 shadow-xs backdrop-blur-xs overflow-hidden",
          className,
        )}
        data-testid="instance-share-card"
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header row: Title & Room Code */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Invite Players & Share Room
                </h3>
                <p className="text-xs text-muted-foreground">
                  Share this join link or scan the QR code to enter the lobby.
                </p>
              </div>
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Room Code:
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-bold transition-all",
                  hasCopiedPin
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10",
                )}
                title="Click to copy Room Code"
                data-testid="copy-room-pin-button"
              >
                {hasCopiedPin ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span>{roomCode}</span>
                    <Copy className="h-3 w-3 opacity-60" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Link Input & Action Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Read-only URL box */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
              </div>
              <Input
                readOnly
                value={roomUrl}
                aria-label="Room invite URL"
                className="pl-9 pr-3 text-xs font-mono bg-muted/30 text-muted-foreground select-all h-10"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            {/* Copy Link Button */}
            <Button
              type="button"
              variant={hasCopiedUrl ? "default" : "default"}
              size="default"
              onClick={handleCopyUrl}
              className={cn(
                "h-10 min-w-32 transition-all font-medium",
                hasCopiedUrl
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-brand text-white hover:bg-brand-hover shadow-xs",
              )}
              data-testid="copy-room-link-button"
            >
              {hasCopiedUrl ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>

            {/* Show QR Code Button */}
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setIsQrOpen(true)}
              className="h-10 border-border font-medium hover:bg-muted"
              data-testid="show-qr-modal-button"
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              QR Code
            </Button>

            {/* Optional Native Share Button on Mobile */}
            {canNativeShare && (
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleNativeShare}
                className="h-10 border-border font-medium hover:bg-muted hidden sm:inline-flex"
                title="Share via device menu"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog Modal */}
      <InstanceQrCodeDialog
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        instanceId={instanceId}
        roomUrl={roomUrl}
        roomCode={roomCode}
        quizTitle={quizTitle}
      />
    </>
  );
}
