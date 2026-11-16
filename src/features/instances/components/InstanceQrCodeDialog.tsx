"use client";

import * as React from "react";
import { Check, Copy, QrCode } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { QrCodeSvg } from "@/shared/utils/qr-code";
import { cn } from "@/shared/utils/merge-class-names";

export interface InstanceQrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  roomUrl: string;
  roomCode: string;
  quizTitle?: string | null;
}

export function InstanceQrCodeDialog({
  open,
  onOpenChange,
  instanceId,
  roomUrl,
  roomCode,
  quizTitle,
}: InstanceQrCodeDialogProps) {
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false);
  const [hasCopiedPin, setHasCopiedPin] = React.useState(false);

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(roomUrl);
        setHasCopiedUrl(true);
        setTimeout(() => setHasCopiedUrl(false), 2000);
      }
    } catch {
      // Ignore clipboard write failure
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
      // Ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md text-center flex flex-col items-center p-6 gap-5 bg-card"
        data-testid="instance-qr-code-dialog"
      >
        <DialogHeader className="text-center sm:text-center items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand mb-1">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Scan to Join Live Battle
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-xs">
            Point your phone camera at this QR code to jump straight into the room lobby.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-white shadow-xs">
          <QrCodeSvg value={roomUrl} size={210} data-testid="instance-qr-code-svg" />
        </div>

        {/* Room Details & Room Code */}
        <div className="w-full space-y-3">
          {quizTitle && (
            <p className="text-sm font-semibold truncate text-foreground px-2">
              {quizTitle}
            </p>
          )}

          {/* Room PIN pill */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Room Code:
            </span>
            <button
              type="button"
              onClick={handleCopyPin}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-mono text-sm font-bold transition-all",
                hasCopiedPin
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10",
              )}
              title="Click to copy Room Code"
              data-testid="copy-qr-pin-button"
            >
              {hasCopiedPin ? (
                <>
                  <Check className="h-3.5 w-3.5" />
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

          {/* Copy Link Action */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full font-medium transition-all",
                hasCopiedUrl && "border-emerald-500 text-emerald-600 bg-emerald-500/10",
              )}
              onClick={handleCopyUrl}
              data-testid="qr-modal-copy-link-button"
            >
              {hasCopiedUrl ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Link Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Room Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
