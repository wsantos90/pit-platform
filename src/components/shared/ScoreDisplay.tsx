import { cn } from "@/lib/utils"

export type ScoreDisplayProps = {
  homeScore: number
  awayScore: number
  result?: "win" | "draw" | "loss"
  size?: "sm" | "md"
  className?: string
}

const scoreSizeClasses = {
  sm: {
    score: "text-sm",
    separator: "text-sm",
  },
  md: {
    score: "text-data-sm",
    separator: "text-body-sm",
  },
}

function getScoreClasses(position: "home" | "away", result?: "win" | "draw" | "loss") {
  if (!result || result === "draw") {
    return "font-semibold text-foreground"
  }

  if (result === "win") {
    return position === "home"
      ? "font-black text-foreground"
      : "font-normal text-foreground-secondary"
  }

  return position === "home"
    ? "font-normal text-foreground-secondary"
    : "font-black text-foreground"
}

export function ScoreDisplay({
  homeScore,
  awayScore,
  result,
  size = "md",
  className,
}: ScoreDisplayProps) {
  return (
    <span
      aria-label={`Placar: ${homeScore} a ${awayScore}`}
      className={cn(
        "inline-flex items-baseline font-data",
        scoreSizeClasses[size].score,
        className
      )}
    >
      <span className={cn("font-data", getScoreClasses("home", result))}>
        {homeScore}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mx-1.5 font-normal text-foreground-tertiary",
          scoreSizeClasses[size].separator
        )}
      >
        ×
      </span>
      <span className={cn("font-data", getScoreClasses("away", result))}>
        {awayScore}
      </span>
    </span>
  )
}
