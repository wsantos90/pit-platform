import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

function getErrorIcon() {
  return React.cloneElement(<AlertTriangle />, {
    "aria-hidden": true,
    className: "size-6 text-error",
  })
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-error-bg">
        {getErrorIcon()}
      </div>

      <div className="space-y-2">
        <p className="text-body-lg font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-body-sm text-foreground-secondary">
          {description}
        </p>
      </div>

      {onRetry ? (
        <Button
          className="border-border/15 bg-transparent text-primary hover:bg-surface-raised hover:text-primary"
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
