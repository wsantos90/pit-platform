import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingSkeletonVariant = "card" | "tableRow" | "textBlock" | "avatar" | "statCard"

export type LoadingSkeletonProps = {
  variant: LoadingSkeletonVariant
  rows?: number
  className?: string
}

function renderTextLines(rows: number) {
  return Array.from({ length: rows }, (_, index) => {
    const widthClass =
      index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-5/6" : "w-2/3"

    return <Skeleton key={index} className={cn("h-4 bg-muted", widthClass)} />
  })
}

function renderTableRows(rows: number) {
  return Array.from({ length: rows }, (_, index) => (
    <div key={index} className="flex items-center gap-4 py-3">
      <Skeleton className="h-4 w-[60px] bg-muted" />
      <Skeleton className="h-4 w-[120px] bg-muted" />
      <Skeleton className="h-4 w-[80px] bg-muted" />
      <Skeleton className="h-4 w-[60px] bg-muted" />
    </div>
  ))
}

export function LoadingSkeleton({
  variant,
  rows = 3,
  className,
}: LoadingSkeletonProps) {
  if (variant === "avatar") {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando..."
        className={cn("inline-flex", className)}
        role="status"
      >
        <Skeleton className="size-10 rounded-full bg-muted" />
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando..."
        className={cn("space-y-3 rounded-lg p-4", className)}
        role="status"
      >
        <Skeleton className="h-4 w-1/3 bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-3/4 bg-muted" />
      </div>
    )
  }

  if (variant === "statCard") {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando..."
        className={cn("space-y-3 rounded-lg border border-border/15 bg-card p-4 md:p-6", className)}
        role="status"
      >
        <Skeleton className="size-10 rounded-xl bg-muted" />
        <Skeleton className="h-3 w-20 bg-muted" />
        <Skeleton className="h-6 w-16 bg-muted" />
      </div>
    )
  }

  if (variant === "tableRow") {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando..."
        className={cn("w-full", className)}
        role="status"
      >
        {renderTableRows(rows)}
      </div>
    )
  }

  return (
    <div
      aria-busy="true"
      aria-label="Carregando..."
      className={cn("space-y-2", className)}
      role="status"
    >
      {renderTextLines(rows)}
    </div>
  )
}
