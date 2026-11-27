export function getRankColor(rank: number): string {
  if (rank <= 3) return "text-amber-600 dark:text-yellow-400";
  if (rank <= 10) return "text-blue-600 dark:text-blue-400";
  if (rank <= 50) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

export function formatPeriodReset(resetInSeconds: number | null): string {
  if (resetInSeconds === null || Number.isNaN(resetInSeconds)) return "—";
  if (resetInSeconds <= 0) return "Resetting…";
  if (resetInSeconds < 60) return "less than a minute";
  if (resetInSeconds < 60 * 60) {
    const mins = Math.floor(resetInSeconds / 60);
    return `${mins} min`;
  }
  if (resetInSeconds < 60 * 60 * 24) {
    const hours = Math.floor(resetInSeconds / (60 * 60));
    return `${hours} hr`;
  }
  const days = Math.floor(resetInSeconds / (60 * 60 * 24));
  return `${days} days`;
}
