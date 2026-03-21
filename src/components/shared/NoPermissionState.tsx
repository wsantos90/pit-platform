import * as React from "react"
import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"

export type NoPermissionStateProps = {
  title?: string
  description?: string
  className?: string
}

function getLockIcon() {
  return React.cloneElement(<Lock />, {
    "aria-hidden": true,
    className: "size-6 text-foreground-tertiary",
  })
}

export function NoPermissionState({
  title = "Acesso restrito",
  description = "Você não tem permissão para acessar este conteúdo.",
  className,
}: NoPermissionStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        {getLockIcon()}
      </div>

      <div className="space-y-2">
        <p className="text-body-lg font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-body-sm text-foreground-secondary">
          {description}
        </p>
      </div>
    </div>
  )
}
