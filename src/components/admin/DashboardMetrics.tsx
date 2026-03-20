"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardTab } from "@/hooks/admin/useDashboardTab"
import {
  CartesianGrid,
  Line,
  LineChart,
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

export default function DashboardMetrics() {
  const { cards, chartData, error, isLoading, metrics } = useDashboardTab()

  if (isLoading && !metrics) {
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
      {error ? (
        <Card className="rounded-xl border border-destructive/40 bg-card">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">Falha ao carregar metricas: {error}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="rounded-xl border border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-foreground-secondary">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <Icon className="h-4 w-4 text-foreground-secondary" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Receita Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => currencyFormatter.format(value)}
                />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => `Mes: ${String(label ?? "")}`}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
