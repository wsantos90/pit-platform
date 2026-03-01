'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TournamentsTabPanel() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base text-foreground">Torneios</CardTitle>
        <CardDescription className="text-foreground-secondary">
          Gestão de corujões, status e chaveamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary">
          Estrutura base pronta. Implementação operacional entra na subtarefa 13.3.
        </p>
      </CardContent>
    </Card>
  )
}
