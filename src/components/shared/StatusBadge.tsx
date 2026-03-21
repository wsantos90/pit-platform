import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 border font-medium",
  {
    variants: {
      status: {
        approved: "bg-success-bg text-success border-success/20",
        pending: "bg-warning-bg text-warning border-warning/20",
        rejected: "bg-error-bg text-error border-error/20",
      },
      size: {
        sm: "rounded-sm px-1.5 py-0.5 text-[10px]",
        md: "rounded-sm px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const STATUS_LABELS: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  rejected: "Rejeitado",
}

function isKnownStatus(
  status: string
): status is "approved" | "pending" | "rejected" {
  return status === "approved" || status === "pending" || status === "rejected"
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof statusBadgeVariants>, "status"> {
  status: "approved" | "pending" | "rejected" | (string & {})
  label?: string
}

function formatStatusLabel(status: string) {
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status]
  }

  const normalized = status.replace(/[_-]+/g, " ").trim()
  if (!normalized) {
    return "Status"
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, size, label, ...props }, ref) => {
    const knownStatus = isKnownStatus(status) ? status : undefined

    return (
      <span
        className={cn(
          statusBadgeVariants({ status: knownStatus, size }),
          !knownStatus && "border-border bg-muted text-foreground-secondary",
          className
        )}
        ref={ref}
        role="status"
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            size === "sm" ? "size-1" : "size-1.5",
            "rounded-full bg-current"
          )}
        />
        {label ?? formatStatusLabel(status)}
      </span>
    )
  }
)

StatusBadge.displayName = "StatusBadge"
