import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MatchDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const { id } = await params

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Detalhes da partida</h1>
          <p className="text-sm text-foreground-secondary">Drill-down reservado para a proxima iteracao do dashboard.</p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/profile/matches">Voltar ao historico</Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Partida {id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground-secondary">
          <p>Esta pagina ja esta conectada ao historico e evita 404 ao abrir o drill-down.</p>
          <p>Na proxima etapa, ela pode receber lineup, stats detalhadas e contexto do confronto.</p>
        </CardContent>
      </Card>
    </div>
  )
}
