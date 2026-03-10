import { PositionBadge } from "@/components/player/PositionBadge"
import { Card, CardContent } from "@/components/ui/card"
import type { PlayerPosition } from "@/types/database"

type PlayerHeaderProps = {
  gamertag: string
  primaryPosition: PlayerPosition
  secondaryPosition?: PlayerPosition | null
}

export default function PlayerHeader({ gamertag, primaryPosition, secondaryPosition }: PlayerHeaderProps) {
  const initial = gamertag.trim().charAt(0).toUpperCase() || "P"

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
          {initial}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground-secondary">Jogador</p>
            <h2 className="text-2xl font-semibold text-foreground">{gamertag}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PositionBadge position={primaryPosition} />
            {secondaryPosition ? <PositionBadge position={secondaryPosition} className="opacity-80" /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
