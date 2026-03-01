'use client'

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DisputeItem = {
  id: string
  bracketId: string
  tournamentId: string
  tournamentName: string | null
  filedByClubId: string
  filedByClubName: string | null
  againstClubId: string
  againstClubName: string | null
  filedByUserId: string
  filedByUserName: string | null
  filedByUserEmail: string | null
  reason: string
  status: "open" | "under_review" | string
  createdAt: string
}

function statusClass(status: string) {
  if (status === "under_review") return "bg-info-bg text-info border-info/30"
  return "bg-warning-bg text-warning border-warning/30"
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("pt-BR")
}

export default function DisputeViewer() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/moderation/disputes", { method: "GET" })
      const payload = (await response.json()) as { disputes?: DisputeItem[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao carregar disputas")
      }
      setDisputes(payload.disputes ?? [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao carregar disputas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDisputes()
  }, [loadDisputes])

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base text-foreground">Disputas</CardTitle>
            <CardDescription className="text-foreground-secondary">
              Visao somente leitura para disputas abertas em moderacao.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadDisputes()} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-foreground-secondary">
          Resolucao de disputas estara disponivel em breve.
        </p>

        {error ? (
          <p className="rounded-lg border border-error/40 bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : null}

        {!loading && disputes.length === 0 ? (
          <p className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground-secondary">
            Nenhuma disputa aberta no momento.
          </p>
        ) : null}

        {!loading && disputes.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[860px]">
              <TableHeader className="bg-hover text-foreground-muted">
                <TableRow>
                  <TableHead>Torneio</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Contra</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{dispute.tournamentName ?? "Torneio desconhecido"}</p>
                      <p className="text-xs text-foreground-muted">Bracket: {dispute.bracketId}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{dispute.filedByClubName ?? "Clube desconhecido"}</p>
                      <p className="text-xs text-foreground-muted">
                        {dispute.filedByUserName ?? "Usuario desconhecido"} ({dispute.filedByUserEmail ?? "sem email"})
                      </p>
                    </TableCell>
                    <TableCell className="text-foreground">{dispute.againstClubName ?? "Clube desconhecido"}</TableCell>
                    <TableCell className="text-foreground-secondary">{dispute.reason}</TableCell>
                    <TableCell>
                      <Badge className={statusClass(dispute.status)}>{dispute.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(dispute.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

