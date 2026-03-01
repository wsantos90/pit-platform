'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DisputesTabPanel() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base text-foreground">Disputas</CardTitle>
        <CardDescription className="text-foreground-secondary">
          Visualização e contexto de contestações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary">
          Estrutura base pronta. Implementação operacional entra na subtarefa 13.4.
        </p>
      </CardContent>
    </Card>
  )
}
