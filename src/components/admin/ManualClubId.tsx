"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useManualIdTab } from "@/hooks/admin/useManualIdTab"

export default function ManualClubId() {
  const {
    clubId,
    displayName,
    error,
    existingClub,
    isSearching,
    isSubmitting,
    onConfirmInsert,
    onSearch,
    preview,
    setClubId,
    setDisplayName,
    setShowConfirmModal,
    showConfirmModal,
    success,
  } = useManualIdTab()

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Inserção Manual de Club ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-club-id">Club ID</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="manual-club-id"
                value={clubId}
                onChange={(event) => setClubId(event.target.value)}
                placeholder="Ex: 637741"
                className="max-w-xs"
              />
              <Button onClick={() => void onSearch()} disabled={isSearching}>
                <Search className="h-4 w-4" />
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          {existingClub ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
              <p className="font-medium text-amber-700">Time já existe na base.</p>
              <p className="mt-1 text-foreground-secondary">
                Nome: <strong className="text-foreground">{existingClub.display_name}</strong>
              </p>
              <p className="text-foreground-secondary">
                Status atual: <strong className="text-foreground">{existingClub.status}</strong>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Preview de 10 jogos recentes</CardTitle>
              <p className="text-sm text-foreground-secondary">
                Clube: <strong>{preview.clubName}</strong> (ID: {preview.clubId})
              </p>
            </div>
            <Button onClick={() => setShowConfirmModal(true)}>Adicionar a discovered_clubs</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {preview.recentMatches.map((match) => (
                <div key={match.matchId} className="rounded-lg border border-border bg-elevated p-3">
                  <p className="text-sm font-medium text-foreground">
                    {match.homeClub} vs {match.awayClub}
                  </p>
                  <p className="text-sm text-foreground-secondary">Placar: {match.score}</p>
                  <p className="text-xs text-foreground-muted">Data: {match.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showConfirmModal && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-lg rounded-xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Confirmar inserção manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground-secondary">
                Confirme o nome de exibição antes de inserir o clube <strong>{preview.clubId}</strong>.
              </p>
              <div className="space-y-2">
                <Label htmlFor="manual-display-name">Display Name</Label>
                <Input
                  id="manual-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nome exibido no PIT"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button onClick={() => void onConfirmInsert()} disabled={isSubmitting}>
                  {isSubmitting ? "Inserindo..." : "Confirmar inserção"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
