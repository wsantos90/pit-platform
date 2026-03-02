import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlayerPosition } from "@/types/database";

const POSITION_BADGE_CLASS: Record<PlayerPosition, string> = {
  GK: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  ZAG: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  VOL: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  MC: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  AE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  AD: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  ATA: "border-orange-500/30 bg-orange-500/10 text-orange-700",
};

type PositionBadgeProps = {
  position: PlayerPosition;
  className?: string;
};

export function PositionBadge({ position, className }: PositionBadgeProps) {
  return (
    <Badge className={cn("border", POSITION_BADGE_CLASS[position], className)}>
      {position}
    </Badge>
  );
}
