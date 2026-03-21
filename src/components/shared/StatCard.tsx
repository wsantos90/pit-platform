"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"

import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatTrend = {
  direction: "up" | "down" | "neutral"
  value: string
}

export type StatCardProps = {
  icon?: React.ReactNode
  label: string
  value: string | number
  trend?: StatTrend
  sparklineData?: number[]
  loading?: boolean
  className?: string
}

function getTrendPresentation(direction: StatTrend["direction"]) {
  switch (direction) {
    case "up":
      return {
        icon: TrendingUp,
        className: "text-success",
      }
    case "down":
      return {
        icon: TrendingDown,
        className: "text-error",
      }
    default:
      return {
        icon: Minus,
        className: "text-foreground-secondary",
      }
  }
}

function renderIcon(icon: React.ReactNode) {
  if (React.isValidElement<{ className?: string; "aria-hidden"?: boolean }>(icon)) {
    return React.cloneElement(icon, {
      "aria-hidden": true,
      className: cn("size-5", icon.props.className),
    })
  }

  return icon
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  sparklineData,
  loading = false,
  className,
}: StatCardProps) {
  const gradientId = React.useId().replace(/:/g, "")
  const trendPresentation = trend ? getTrendPresentation(trend.direction) : null
  const TrendIcon = trendPresentation?.icon
  const chartData = sparklineData?.map((entry, index) => ({ index, value: entry }))

  if (loading) {
    return <LoadingSkeleton className={className} variant="statCard" />
  }

  return (
    <Card className={cn("rounded-lg border-border/15 bg-card shadow-none", className)}>
      <CardContent className="p-4 pt-4 md:p-6 md:pt-6">
        {icon || (trend && TrendIcon) ? (
          <div className="flex items-start justify-between gap-3">
            {icon ? (
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
                {renderIcon(icon)}
              </div>
            ) : null}

            {trend && TrendIcon ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-caption font-data",
                  trendPresentation.className
                )}
              >
                <TrendIcon aria-hidden="true" className="size-4" />
                <span>{trend.value}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={cn("space-y-1", (icon || trend) && "mt-3")}>
          <p className="text-label text-foreground-secondary">{label}</p>
          <p className="text-data-lg font-data text-foreground">{value}</p>
        </div>

        {chartData && chartData.length > 0 ? (
          <div aria-hidden="true" className="mt-3 h-10">
            <ResponsiveContainer height={40} width="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="value"
                  dot={false}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
