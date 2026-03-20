"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatSubscriptionDateTime,
  getSubscriptionStatusBadgeClass,
  subscriptionStatusOptions,
  useSubscriptionsTab,
  type SubscriptionFilter,
} from "@/hooks/admin/useSubscriptionsTab"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

export default function SubscriptionManager() {
  const { error, isLoading, isRefreshing, meta, refresh, setStatusFilter, statusFilter, subscriptions } = useSubscriptionsTab()

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
              {subscriptionStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => void refresh()}>
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
                        <Badge className={getSubscriptionStatusBadgeClass(subscription.status)}>{subscription.status}</Badge>
                      </TableCell>
                      <TableCell>{currencyFormatter.format(subscription.amount ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatSubscriptionDateTime(subscription.current_period_start)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatSubscriptionDateTime(subscription.current_period_end)}</TableCell>
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
