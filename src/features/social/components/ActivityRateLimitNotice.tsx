"use client";

import { useEffect, useState, type ReactElement } from "react";

interface ActivityRateLimitNoticeProps {

cooldownSeconds: number;

onCooldownComplete?: () => void;
}

export function ActivityRateLimitNotice({
cooldownSeconds,
onCooldownComplete,
}: ActivityRateLimitNoticeProps): ReactElement {

const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
Math.max(0, Math.floor(cooldownSeconds)),
  );

useEffect(() => {
if (secondsRemaining <= 0) {
return;
    }
const timer = setTimeout(() => {
setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1_000);
return () => clearTimeout(timer);
  }, [secondsRemaining]);

useEffect(() => {
if (secondsRemaining === 0 && onCooldownComplete !== undefined) {
onCooldownComplete();
    }
  }, [secondsRemaining, onCooldownComplete]);

const copy =
secondsRemaining > 0
? `Activity is temporarily rate-limited. Try again in ${secondsRemaining} seconds.`
: "You can try again now.";

return (
<div
role="status"
aria-live="polite"
data-testid="activity-rate-limit-notice"
data-seconds-remaining={secondsRemaining}
data-cooldown-complete={secondsRemaining === 0 ? "true" : "false"}
className="flex flex-col gap-2 p-4 rounded-md border border-amber-300 bg-amber-50 text-amber-900"
    >
<p className="text-sm font-medium">{copy}</p>
</div>
  );
}
