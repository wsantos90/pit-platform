"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PreviewMatch = {
  matchId: string
  homeClub: string
  awayClub: string
  score: string
  date: string
}

type ManualClubPreview = {
  clubId: string
  clubName: string
  recentMatches: PreviewMatch[]
}

type ExistingClub = {
  id: string
  ea_club_id: string
  display_name: string
  status: string
  discovered_via: string | null
}

export default function ManualClubId() {
  const [clubId, setClubId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [preview, setPreview] = useState<ManualClubPreview | null>(null)
  const [existingClub, setExistingClub] = useState<ExistingClub | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSearch() {
    const trimmedClubId = clubId.trim()
    if (!trimmedClubId) {
      setError("Informe um clubId válido.")
      return
    }

    setIsSearching(true)
    setError(null)
    setSuccess(null)
    setExistingClub(null)
    setPreview(null)
    setShowConfirmModal(false)

    try {
      const response = await fetch(`/api/admin/manual-club?clubId=${encodeURIComponent(trimmedClubId)}`, {
        method: "GET",
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as
        | ManualClubPreview
        | { alreadyExists: true; club: ExistingClub }
        | { error?: string; details?: string }
        | null

      if (!response.ok) {
        const errorMessage =
          (payload as { error?: string; details?: string } | null)?.details ??
          (payload as { error?: string } | null)?.error ??
          "Não foi possível buscar partidas para esse clubId."
        throw new Error(errorMessage)
      }

      if (payload && "alreadyExists" in payload && payload.alreadyExists) {
        setExistingClub(payload.club)
        setDisplayName(payload.club.display_name)
        return
      }

      const previewPayload = payload as ManualClubPreview
      setPreview(previewPayload)
      setDisplayName(previewPayload.clubName)
    } catch (requestError) {
      setPreview(null)
      setExistingClub(null)
      setDisplayName("")
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível buscar partidas para esse clubId."
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function onConfirmInsert() {
    if (!preview) return

    const trimmedDisplayName = displayName.trim()
    if (trimmedDisplayName.length < 2) {
      setError("displayName deve ter pelo menos 2 caracteres.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/manual-club", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clubId: preview.clubId,
          displayName: trimmedDisplayName,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; alreadyExists?: boolean; club?: ExistingClub; error?: string; details?: string }
        | null

      if (!response.ok || !payload?.success) {
        const errorMessage =
          payload?.details ?? payload?.error ?? "Não foi possível inserir o clube manualmente."
        throw new Error(errorMessage)
      }

      if (payload.alreadyExists && payload.club) {
        setExistingClub(payload.club)
        setPreview(null)
        setDisplayName(payload.club.display_name)
        setShowConfirmModal(false)
        setSuccess(null)
        return
      }

      setExistingClub(null)
      setSuccess(`Clube ${trimmedDisplayName} inserido com sucesso em discovered_clubs.`)
      setShowConfirmModal(false)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível inserir o clube manualmente."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
