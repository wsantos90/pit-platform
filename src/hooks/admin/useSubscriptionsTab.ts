import { useCallback, useEffect, useState } from "react"

type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due"
export type SubscriptionFilter = "all" | SubscriptionStatus

export type SubscriptionRow = {
  id: string
  user_id: string | null
  club_id: string | null
  plan: string
  status: SubscriptionStatus
  gateway: string
  gateway_subscription_id: string | null
  amount: number
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
  user_display_name: string | null
  user_email: string | null
  club_name: string | null
}

type SubscriptionsPayload = {
  subscriptions: SubscriptionRow[]
  meta?: {
    total_count?: number
    source?: string
    warning?: string | null
  }
}

export const subscriptionStatusOptions: Array<{ value: SubscriptionFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "past_due", label: "Past due" },
  { value: "expired", label: "Expirado" },
  { value: "cancelled", label: "Cancelado" },
]

export function formatSubscriptionDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

export function getSubscriptionStatusBadgeClass(status: SubscriptionStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  if (status === "past_due") return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  if (status === "cancelled") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-slate-500/30 bg-slate-500/10 text-slate-700"
}

export function useSubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([])
  const [statusFilter, setStatusFilter] = useState<SubscriptionFilter>("all")
  const [meta, setMeta] = useState<SubscriptionsPayload["meta"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptions = useCallback(async (filter: SubscriptionFilter, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setIsRefreshing(true)
    }

    try {
      const params = new URLSearchParams()
      if (filter !== "all") {
        params.set("status", filter)
      }

      const response = await fetch(
        params.size > 0 ? `/api/admin/subscriptions?${params.toString()}` : "/api/admin/subscriptions",
        {
          method: "GET",
          cache: "no-store",
        }
      )

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "failed_to_load_subscriptions")
      }

      const payload = (await response.json()) as SubscriptionsPayload
      setSubscriptions(payload.subscriptions ?? [])
      setMeta(payload.meta ?? null)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_subscriptions"
      setError(message)
    } finally {
      setIsLoading(false)
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchSubscriptions(statusFilter)
  }, [fetchSubscriptions, statusFilter])

  const refresh = useCallback(async () => {
    await fetchSubscriptions(statusFilter)
  }, [fetchSubscriptions, statusFilter])

  return {
    error,
    isLoading,
    isRefreshing,
    meta,
    refresh,
    setStatusFilter,
    statusFilter,
    subscriptions,
  }
}
