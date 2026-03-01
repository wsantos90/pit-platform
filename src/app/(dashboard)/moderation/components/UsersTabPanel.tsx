'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UsersTabPanel() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base text-foreground">Usuários</CardTitle>
        <CardDescription className="text-foreground-secondary">
          Busca e administração de contas.
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
