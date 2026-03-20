"use client"

import { AlertTriangle, BarChart3, TrendingUp, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatFinancialPeriod,
  periodOptions,
  useFinancialTab,
  type PeriodOption,
} from "@/hooks/admin/useFinancialTab"
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

export default function FinancialDashboard() {
  const { compositionData, data, error, isLoading, isRefreshing, period, refresh, setPeriod, timeline } = useFinancialTab()

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
              onClick={() => void refresh()}
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
                    <AreaChart data={timeline.map((row) => ({ ...row, period: formatFinancialPeriod(row.period) }))}>
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
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">Atencao</Badge>
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
