"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due"
type SubscriptionFilter = "all" | SubscriptionStatus

type SubscriptionRow = {
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

const statusOptions: Array<{ value: SubscriptionFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "past_due", label: "Past due" },
  { value: "expired", label: "Expirado" },
  { value: "cancelled", label: "Cancelado" },
]

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

function statusBadgeClass(status: SubscriptionStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  if (status === "past_due") return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  if (status === "cancelled") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-slate-500/30 bg-slate-500/10 text-slate-700"
}

export default function SubscriptionManager() {
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

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground">Gestao de planos Premium - Fase 2</p>
          <p className="text-sm text-foreground-secondary">
            Esta aba esta em modo leitura. Alteracoes de assinatura seguem via gateway de pagamento.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base font-semibold">Assinaturas</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SubscriptionFilter)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => void fetchSubscriptions(statusFilter)}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}

          {isLoading ? (
            <p className="text-sm text-foreground-secondary">Carregando...</p>
          ) : subscriptions.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground-secondary">Nenhuma assinatura encontrada.</p>
              {meta?.warning === "subscriptions_table_empty" ? (
                <p className="text-xs text-foreground-muted">
                  A tabela <code>subscriptions</code> esta vazia neste ambiente.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuario / Clube</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Gateway ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="whitespace-nowrap">{subscription.plan}</TableCell>
                      <TableCell className="min-w-48">
                        <p className="font-medium text-foreground">
                          {subscription.user_display_name ?? subscription.user_email ?? "-"}
                        </p>
                        <p className="text-xs text-foreground-muted">{subscription.club_name ? `Clube: ${subscription.club_name}` : "Sem clube"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(subscription.status)}>{subscription.status}</Badge>
                      </TableCell>
                      <TableCell>{currencyFormatter.format(subscription.amount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(subscription.current_period_start)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(subscription.current_period_end)}</TableCell>
                      <TableCell className="max-w-48 truncate">{subscription.gateway_subscription_id ?? "-"}</TableCell>
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
