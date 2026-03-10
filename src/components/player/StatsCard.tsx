import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatsCardProps = {
  label: string
  value: string
  helper?: string
  className?: string
}

export function StatsCard({ label, value, helper, className }: StatsCardProps) {
  return (
    <Card className={cn("border-border bg-card", className)}>
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-secondary">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {helper ? <p className="text-xs text-foreground-secondary">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
