import * as React from "react"
import { Inbox } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateAction = {
  label: string
  onClick?: () => void
}

export type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

function getIcon(icon: React.ReactNode | undefined) {
  const node = icon ?? <Inbox />

  if (React.isValidElement<{ className?: string; "aria-hidden"?: boolean }>(node)) {
    return React.cloneElement(node, {
      "aria-hidden": true,
      className: cn("size-6 text-foreground-tertiary", node.props.className),
    })
  }

  return node
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        {getIcon(icon)}
      </div>

      <div className="space-y-2">
        <p className="text-body-lg font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-body-sm text-foreground-secondary">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <Button
          className="border-border/15 bg-transparent text-primary hover:bg-surface-raised hover:text-primary"
          onClick={action.onClick}
          size="sm"
          type="button"
          variant="outline"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
