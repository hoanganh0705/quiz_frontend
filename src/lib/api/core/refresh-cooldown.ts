

const COOLDOWN_DURATION_MS = 1000;

let cooldownStartedAt: number | null = null;

export function isInCooldown(): boolean {
if (cooldownStartedAt === null) {
return false;
  }

const now = Date.now();
const elapsed = now - cooldownStartedAt;

return elapsed < COOLDOWN_DURATION_MS;
}

export function startCooldown(): void {

if (cooldownStartedAt === null) {
cooldownStartedAt = Date.now();
  }
}

export function clearCooldown(): void {
cooldownStartedAt = null;
}

export function getRemainingCooldownMs(): number {
if (cooldownStartedAt === null) {
return 0;
  }

const now = Date.now();
const elapsed = now - cooldownStartedAt;
const remaining = COOLDOWN_DURATION_MS - elapsed;

return remaining > 0 ? remaining : 0;
}

export function _resetCooldownForTesting(): void {
cooldownStartedAt = null;
}
