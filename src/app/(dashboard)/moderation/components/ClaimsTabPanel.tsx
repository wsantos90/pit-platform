'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClaimsTabPanel() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base text-foreground">Fila de Claims</CardTitle>
        <CardDescription className="text-foreground-secondary">
          Revisão e decisão de reivindicações pendentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary">
          Estrutura base pronta. Implementação operacional entra na subtarefa 13.2.
        </p>
      </CardContent>
    </Card>
  )
}
