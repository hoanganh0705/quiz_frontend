export function getRankColor(rank: number): string {
  if (rank <= 3) return "text-amber-600 dark:text-yellow-400";
  if (rank <= 10) return "text-blue-600 dark:text-blue-400";
  if (rank <= 50) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

export function getChangeIcon(change: number): "up" | "down" | "none" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "none";
}

export function getBadgeIcon(badge: string): string {
  switch (badge) {
    case "Diamond":
      return "💎";
    case "Platinum":
      return "🥇";
    case "Gold":
      return "🥈";
    case "Silver":
      return "🥉";
    case "Bronze":
      return "🏅";
    default:
      return "⭐";
  }
}

export function formatSeasonEndDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Season ended";
  if (diffDays === 1) return "1 day left";
  if (diffDays <= 7) return `${diffDays} days left`;
  return `${diffDays} days left`;
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
