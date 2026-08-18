"use client";

import { memo, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardContent } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

import { BadgeFlairPickerDialog } from "./BadgeFlairPickerDialog";

import { useMyBadges } from "@/features/users/hooks";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export const FlairManagementCard = memo(function FlairManagementCard() {
const coinFlag = getFeatureFlagValue("coin_economy_live");
const spendFlag = getFeatureFlagValue("coin_spend_live");
const isPlaceholder =
coinFlag === "placeholder" || spendFlag === "placeholder";

const { badges, isLoading } = useMyBadges();
const [open, setOpen] = useState(false);

const showActiveBadge = false;
const activeBadgeName = showActiveBadge && badges.items[0]?.name;
const activeBadgeDescription =
showActiveBadge && badges.items[0]?.description;

if (isPlaceholder) return null;

return (
<Card data-testid="flair-management-card">
<CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
<CardTitle className="flex items-center gap-2 text-base">
<Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
Profile flair
        </CardTitle>
<Button
type="button"
variant="outline"
size="sm"
onClick={() => setOpen(true)}
disabled={isLoading}
data-testid="flair-management-change"
        >
{showActiveBadge ? "Change flair" : "Pick a flair"}
</Button>
</CardHeader>
<CardContent className="space-y-1 text-sm">
{isLoading ? (
<Skeleton className="h-5 w-48" />
        ) : activeBadgeName ? (
<>
<p className="font-medium">
Currently showing: <span className="text-foreground">{activeBadgeName}</span>
</p>
{activeBadgeDescription ? (
<p className="text-xs text-muted-foreground">{activeBadgeDescription}</p>
            ) : null}
</>
        ) : (
<p className="text-xs text-muted-foreground">
No flair equipped. Pick one of your earned badges to display it
            next to your name for 7 days.
          </p>
        )}
</CardContent>

<BadgeFlairPickerDialog
open={open}
onOpenChange={setOpen}
badges={badges.items.map((b) => ({
id: b.badgeId,
name: b.name,
description: b.description,
rarity: b.rarity,
        }))}
      />
</Card>
  );
});
