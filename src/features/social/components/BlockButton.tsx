"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Ban, ShieldCheck } from "lucide-react";

import { BlockConfirmDialog } from "@/features/social/components/BlockConfirmDialog";
import { BlockErrorBanner } from "@/features/social/components/BlockErrorBanner";
import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";
import { SelfActionGate } from "@/features/social/components/SelfActionGate";
import { UnblockConfirmDialog } from "@/features/social/components/UnblockConfirmDialog";
import type { BlockErrorCode } from "@/features/social/components/block-error-copy";
import { useBlock } from "@/features/social/hooks/useBlock";
import { useUnblock } from "@/features/social/hooks/useUnblock";
import { useRelationship } from "@/features/social/hooks/useRelationship";
import { useSocialPermissions } from "@/features/social/hooks/useSocialPermissions";

export interface BlockButtonProps {

targetUserId: string;

className?: string;
}

const BUTTON_BASE =
"h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function BlockButton({
targetUserId,
className,
}: BlockButtonProps): ReactNode {

const { relationship, isLoading } = useRelationship(targetUserId);
const { canBlock, canUnblock } = useSocialPermissions(targetUserId);
const { block, isPending: isBlockPending, error: blockError } =
useBlock(targetUserId);
const { unblock, isPending: isUnblockPending, error: unblockError } =
useUnblock(targetUserId);

const [blockDialogOpen, setBlockDialogOpen] = useState(false);
const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);

const isPending = isBlockPending || isUnblockPending;
const error: BlockErrorCode | null = (blockError ?? unblockError) ?? null;

if (isLoading) return null;
if (!canBlock && !canUnblock) return null;

const isBlocked = relationship === "blocked";

return (
<SelfActionGate targetUserId={targetUserId} fallback={null}>
<div className={className} data-testid="block-button-root">
{isPending ? (
<FollowPendingIndicator
text={isBlocked ? "Unblocking..." : "Blocking..."}
size="md"
          />
        ) : (
<>
{isBlocked && canUnblock ? (
<Button
type="button"
variant="secondary"
className={BUTTON_BASE}
data-testid="block-button-unblock"
aria-label="Unblock this user"
aria-pressed="true"
onClick={() => {
setUnblockDialogOpen(true);
                }}
              >
<ShieldCheck
className="mr-1.5 inline-block h-4 w-4"
aria-hidden="true"
                />
Unblock
              </Button>
            ) : null}

{!isBlocked && canBlock ? (
<Button
type="button"
variant="destructive"
className={BUTTON_BASE}
data-testid="block-button-block"
aria-label="Block this user"
onClick={() => {
setBlockDialogOpen(true);
                }}
              >
<Ban
className="mr-1.5 inline-block h-4 w-4"
aria-hidden="true"
                />
Block
              </Button>
            ) : null}
</>
        )}

{error !== null && !isPending && (
<BlockErrorBanner
error={error}
onRetry={
isBlocked
? () => {
void unblock();
                  }
: () => {
void block();
                  }
            }
          />
        )}
</div>

{/* ── Confirm dialogs ────────────────────────────────────────── */}
<BlockConfirmDialog
open={blockDialogOpen}
onOpenChange={setBlockDialogOpen}
onConfirm={() => {
setBlockDialogOpen(false);
void block();
        }}
isPending={isBlockPending}
      />

<UnblockConfirmDialog
open={unblockDialogOpen}
onOpenChange={setUnblockDialogOpen}
onConfirm={() => {
setUnblockDialogOpen(false);
void unblock();
        }}
isPending={isUnblockPending}
      />
</SelfActionGate>
  );
}