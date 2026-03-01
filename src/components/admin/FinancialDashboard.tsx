"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3, TrendingUp, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type PeriodOption = "30d" | "90d" | "12m"

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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

const periodOptions: Array<{ value: PeriodOption; label: string }> = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "12m", label: "12 meses" },
]

function formatPeriod(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export default function FinancialDashboard() {
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
        period: formatPeriod(row.period),
        torneios: row.tournament_revenue,
        assinaturas: row.subscription_revenue,
      })),
    [timeline]
  )

  if (isLoading && !data) {
    return (
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="py-6">
          <p className="text-sm text-foreground-secondary">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Dashboard Financeiro</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodOption)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void fetchFinancial(period)}
              disabled={isRefreshing}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-xl border border-border bg-elevated">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-xs text-foreground-secondary">Receita Total</p>
                  <p className="text-xl font-semibold text-foreground">
                    {currencyFormatter.format(data?.summary.revenue_total ?? 0)}
                  </p>
                </div>
                <Wallet className="h-4 w-4 text-foreground-secondary" />
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-elevated">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-xs text-foreground-secondary">Pendente</p>
                  <p className="text-xl font-semibold text-foreground">
                    {currencyFormatter.format(data?.summary.pending_total ?? 0)}
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-foreground-secondary" />
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-elevated">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-xs text-foreground-secondary">Projecao 30 dias</p>
                  <p className="text-xl font-semibold text-foreground">
                    {currencyFormatter.format(data?.projection_30d ?? 0)}
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-foreground-secondary" />
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-elevated">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-xs text-foreground-secondary">Pagamentos em atraso</p>
                  <p className="text-xl font-semibold text-foreground">{data?.summary.overdue_count_total ?? 0}</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-foreground-secondary" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="rounded-xl border border-border bg-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-foreground">Receita ao longo do tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline.map((row) => ({ ...row, period: formatPeriod(row.period) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value: number) => currencyFormatter.format(value)}
                      />
                      <Tooltip formatter={(value) => currencyFormatter.format(Number(value ?? 0))} />
                      <Area
                        type="monotone"
                        dataKey="total_revenue"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-elevated">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-foreground">Receita por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compositionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value: number) => currencyFormatter.format(value)}
                      />
                      <Tooltip formatter={(value) => currencyFormatter.format(Number(value ?? 0))} />
                      <Bar dataKey="torneios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="assinaturas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Times inadimplentes</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.delinquent_clubs?.length ?? 0) === 0 ? (
            <p className="text-sm text-foreground-secondary">Nenhum time inadimplente encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clube</TableHead>
                    <TableHead>Dias em atraso</TableHead>
                    <TableHead>Valor em atraso</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Alerta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.delinquent_clubs.map((club) => (
                    <TableRow key={club.club_id}>
                      <TableCell>{club.club_name}</TableCell>
                      <TableCell>{club.days_overdue}</TableCell>
                      <TableCell>{currencyFormatter.format(club.overdue_amount)}</TableCell>
                      <TableCell>{club.strikes}</TableCell>
                      <TableCell>
                        {club.days_overdue > 30 ? (
                          <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Critico</Badge>
                        ) : (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">Atenção</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
