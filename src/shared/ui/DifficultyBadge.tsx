import { Badge } from "@/components/ui/Badge";

import { cn } from "@/shared/utils/merge-class-names";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface DifficultyStyleConfig {
  readonly label: string;
  readonly soft: string;
  readonly solid: string;
  readonly solidHover: string;
}

export const DIFFICULTY_STYLES: Readonly<
  Record<DifficultyLevel, DifficultyStyleConfig>
> = {
  easy: {
    label: "Easy",
    soft: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    solid: "bg-emerald-600 text-white",
    solidHover: "hover:bg-emerald-500",
  },
  medium: {
    label: "Medium",
    soft: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    solid: "bg-amber-600 text-white",
    solidHover: "hover:bg-amber-500",
  },
  hard: {
    label: "Hard",
    soft: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    solid: "bg-rose-600 text-white",
    solidHover: "hover:bg-rose-500",
  },
} as const;

const FALLBACK_STYLE: DifficultyStyleConfig = {
  label: "",
  soft: "bg-muted text-muted-foreground border-border",
  solid: "bg-muted text-foreground",
  solidHover: "hover:bg-muted/80",
};

export function normalizeDifficulty(
  raw: string | null | undefined,
): DifficultyLevel | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === "easy" || lower === "medium" || lower === "hard") {
    return lower;
  }
  return null;
}

export function getDifficultyStyle(
  difficulty: string | null | undefined,
): DifficultyStyleConfig {
  const normalized = normalizeDifficulty(difficulty);
  if (!normalized) return FALLBACK_STYLE;
  return DIFFICULTY_STYLES[normalized];
}

export interface DifficultyBadgeProps {
  difficulty: string;
  variant?: "soft" | "solid";
  asDiv?: boolean;
  className?: string;
}

export function DifficultyBadge({
  difficulty,
  variant = "soft",
  asDiv = false,
  className,
}: DifficultyBadgeProps) {
  const style = getDifficultyStyle(difficulty);
  const label = style.label || difficulty;
  const toneClass = variant === "solid" ? style.solid : style.soft;

  if (asDiv) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
          variant === "solid" && "border-transparent",
          toneClass,
          className,
        )}
      >
        {label}
      </div>
    );
  }

  return (
    <Badge
      variant={variant === "solid" ? "default" : "outline"}
      className={cn("capitalize", toneClass, className)}
    >
      {label}
    </Badge>
  );
}
