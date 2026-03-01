import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors",
        className
      )}
      {...props}
    />
  )
})

Badge.displayName = "Badge"

export { Badge }

