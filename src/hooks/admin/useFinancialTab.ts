import { useCallback, useEffect, useMemo, useState } from "react"

export type PeriodOption = "30d" | "90d" | "12m"

type FinancialTimelinePoint = {
  period: string
  total_revenue: number
  total_refunded: number
  total_pending: number
  tournament_revenue: number
  subscription_revenue: number
  overdue_count: number
}

type DelinquentClub = {
  club_id: string
  club_name: string
  days_overdue: number
  overdue_amount: number
  strikes: number
}

type FinancialPayload = {
  period: PeriodOption
  summary: {
    revenue_total: number
    refunded_total: number
    pending_total: number
    overdue_count_total: number
  }
  projection_30d: number
  timeline: FinancialTimelinePoint[]
  delinquent_clubs: DelinquentClub[]
}

export const periodOptions: Array<{ value: PeriodOption; label: string }> = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "12m", label: "12 meses" },
]

export function formatFinancialPeriod(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function useFinancialTab() {
  const [period, setPeriod] = useState<PeriodOption>("30d")
  const [data, setData] = useState<FinancialPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFinancial = useCallback(async (nextPeriod: PeriodOption, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setIsRefreshing(true)
    }

    try {
      const response = await fetch(`/api/admin/financial?period=${encodeURIComponent(nextPeriod)}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "failed_to_load_financial_dashboard")
      }

      const payload = (await response.json()) as FinancialPayload
      setData(payload)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_financial_dashboard"
      setError(message)
    } finally {
      setIsLoading(false)
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchFinancial(period)
  }, [fetchFinancial, period])

  const timeline = useMemo(() => data?.timeline ?? [], [data])
  const compositionData = useMemo(
    () =>
      timeline.map((row) => ({
        period: formatFinancialPeriod(row.period),
        torneios: row.tournament_revenue,
        assinaturas: row.subscription_revenue,
      })),
    [timeline]
  )

  const refresh = useCallback(async () => {
    await fetchFinancial(period)
  }, [fetchFinancial, period])

  return {
    compositionData,
    data,
    error,
    isLoading,
    isRefreshing,
    period,
    refresh,
    setPeriod,
    timeline,
  }
}
