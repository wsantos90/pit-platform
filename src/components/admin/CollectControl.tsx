"use client"

import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCollectTab } from "@/hooks/admin/useCollectTab"

export default function CollectControl() {
  const { canCollect, extensionOk, handleCollect, isCheckingExtension, refreshExtensionStatus, state } = useCollectTab()

  return (
    <div className="space-y-4">
      {extensionOk === false && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Extensão PIT Collect 1.1.0 não detectada</p>
                <p className="text-foreground-secondary">
                  A extensao oficial agora faz duas coisas: coleta manual de campeonatos e sincronizacao de cookies para o proxy do Discovery.
                </p>
                <p className="text-foreground-secondary">
                  Gere a extensao com <code className="rounded bg-muted px-1">npm run build:extension</code> e carregue
                  <code className="rounded bg-muted px-1"> dist/browser-extension/</code> no navegador.
                </p>
                <p className="text-foreground-secondary">
                  Depois confirme que <code className="rounded bg-muted px-1">NEXT_PUBLIC_PIT_EXTENSION_ID</code> aponta para o ID da extensao instalada.
                </p>
                <Button variant="outline" size="sm" className="gap-2" disabled={isCheckingExtension} onClick={() => void refreshExtensionStatus()}>
                  {isCheckingExtension ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Verificar novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Campeonatos Ativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Coleta partidas recentes de clubes em campeonatos ativos usando os cookies EA do seu browser. A build operacional da extensao tambem sincroniza esses cookies com o cookie service usado pelo Discovery.
          </p>

          <Button onClick={handleCollect} disabled={!canCollect} className="gap-2">
            {state.phase === "starting" || state.phase === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {state.phase === "starting"
              ? "Iniciando..."
              : state.phase === "running"
                ? "Coletando..."
                : "Atualizar campeonatos ativos"}
          </Button>
        </CardContent>
      </Card>

      {(state.phase === "running" || state.phase === "done") && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {state.phase === "done" ? "Resultado" : "Progresso"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {state.clubs.map((club) => (
                <li
                  key={club.ea_club_id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {club.status === "pending" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {club.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {club.status === "failed" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    <span className="font-mono text-xs text-foreground">{club.ea_club_id}</span>
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    {club.status === "success" && `+${club.matches_new ?? 0} partidas`}
                    {club.status === "failed" && (
                      <span className="text-red-400" title={club.error}>
                        falhou
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {state.phase === "done" && (
              <div className="mt-4 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
                <p className="text-foreground-secondary">
                  <span className="font-medium text-green-500">{state.summary.success}</span> clubes coletados - <span className="font-medium text-primary">{state.summary.matches_new}</span> partidas novas - {state.summary.failed > 0 && <span className="font-medium text-red-500">{state.summary.failed} falhos</span>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.phase === "error" && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-foreground">{state.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
