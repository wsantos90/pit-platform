'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ClaimRejectDialog from "./ClaimRejectDialog"

type ClaimStatusFilter = "pending" | "approved" | "rejected" | "all"

interface ClaimItem {
  id: string
  status: "pending" | "approved" | "rejected"
  photoUrl: string | null
  photoSignedUrl: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  rejectionReason: string | null
  claimant: {
    id: string
    displayName: string | null
    email: string | null
  }
  club: {
    id: string
    displayName: string | null
    eaClubId: string | null
    status: string | null
  }
}

const statusOptions: Array<{ value: ClaimStatusFilter; label: string }> = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Rejeitadas" },
  { value: "all", label: "Todas" },
]

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("pt-BR")
}

function statusBadgeClass(status: ClaimItem["status"]) {
  if (status === "pending") return "bg-warning-bg text-warning border-warning/30"
  if (status === "approved") return "bg-success-bg text-success border-success/30"
  return "bg-error-bg text-error border-error/30"
}

export default function ClaimQueue() {
  const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>("pending")
  const [claims, setClaims] = useState<ClaimItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [actionClaimId, setActionClaimId] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [rejectClaim, setRejectClaim] = useState<ClaimItem | null>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)

  const loadClaims = useCallback(async (filter: ClaimStatusFilter) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/moderation/claims?status=${filter}`, {
        method: "GET",
      })
      const payload = (await response.json()) as { claims?: ClaimItem[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel carregar a fila de claims.")
      }
      setClaims(payload.claims ?? [])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar a fila de claims."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const onApprove = useCallback(async (claim: ClaimItem) => {
    setActionClaimId(claim.id)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/claim/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          action: "approve",
        }),
      })
      const payload = (await response.json()) as { message?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel aprovar a claim.")
      }

      setClaims((current) => current.filter((item) => item.id !== claim.id))
      setSuccess(payload.message ?? "Claim aprovada com sucesso.")
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Nao foi possivel aprovar a claim."
      )
    } finally {
      setActionClaimId(null)
    }
  }, [])

  const onReject = useCallback(
    async (reason: string) => {
      if (!rejectClaim) return

      setActionClaimId(rejectClaim.id)
      setRejectError(null)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch("/api/claim/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId: rejectClaim.id,
            action: "reject",
            rejectionReason: reason,
          }),
        })

        const payload = (await response.json()) as { message?: string; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel rejeitar a claim.")
        }

        setClaims((current) => current.filter((item) => item.id !== rejectClaim.id))
        setRejectClaim(null)
        setSuccess(payload.message ?? "Claim rejeitada com sucesso.")
      } catch (requestError) {
        const message =
          requestError instanceof Error ? requestError.message : "Nao foi possivel rejeitar a claim."
        setRejectError(message)
      } finally {
        setActionClaimId(null)
      }
    },
    [rejectClaim]
  )

  const sortedClaims = useMemo(
    () => [...claims].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [claims]
  )

  useEffect(() => {
    void loadClaims("pending")
  }, [loadClaims])

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base text-foreground">Fila de claims</CardTitle>
          <select
            value={statusFilter}
            onChange={(event) => {
              const next = event.target.value as ClaimStatusFilter
              setStatusFilter(next)
              void loadClaims(next)
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => void loadClaims(statusFilter)}
          >
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>

        {error ? (
          <p className="rounded-lg border border-error/40 bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-success/40 bg-success-bg px-3 py-2 text-sm text-success">{success}</p>
        ) : null}

        {!loading && sortedClaims.length === 0 ? (
          <p className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground-secondary">
            Nenhuma claim encontrada para o filtro selecionado.
          </p>
        ) : null}

        {sortedClaims.map((claim) => (
          <div key={claim.id} className="rounded-lg border border-border bg-elevated p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{claim.club.displayName ?? "Time sem nome"}</p>
                <p className="text-xs text-foreground-muted">EA Club ID: {claim.club.eaClubId ?? "N/A"}</p>
                <p className="text-xs text-foreground-secondary">
                  Claimant: {claim.claimant.displayName ?? "Sem nome"} ({claim.claimant.email ?? "sem e-mail"})
                </p>
                <p className="text-xs text-foreground-secondary">Criada em: {formatDate(claim.createdAt)}</p>
              </div>

              <Badge className={statusBadgeClass(claim.status)}>{claim.status}</Badge>
            </div>

            {claim.photoSignedUrl ? (
              <button
                type="button"
                className="mt-3 block w-full overflow-hidden rounded-lg border border-border"
                onClick={() => setPhotoPreviewUrl(claim.photoSignedUrl)}
              >
                <img
                  src={claim.photoSignedUrl}
                  alt={`Prova de claim do time ${claim.club.displayName ?? ""}`}
                  className="h-40 w-full object-cover"
                />
              </button>
            ) : (
              <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground-muted">
                Foto de prova indisponivel para visualizacao.
              </p>
            )}

            {claim.status === "pending" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={actionClaimId === claim.id}
                  onClick={() => void onApprove(claim)}
                >
                  {actionClaimId === claim.id ? "Aprovando..." : "Aprovar"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={actionClaimId === claim.id}
                  onClick={() => {
                    setRejectError(null)
                    setRejectClaim(claim)
                  }}
                >
                  Rejeitar
                </Button>
              </div>
            ) : null}

            {claim.status === "rejected" && claim.rejectionReason ? (
              <p className="mt-3 rounded-lg border border-error/40 bg-error-bg px-3 py-2 text-sm text-error">
                Motivo: {claim.rejectionReason}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>

      {rejectClaim ? (
        <ClaimRejectDialog
          open
          clubName={rejectClaim.club.displayName ?? "Time sem nome"}
          loading={actionClaimId === rejectClaim.id}
          initialError={rejectError}
          onClose={() => setRejectClaim(null)}
          onConfirm={onReject}
        />
      ) : null}

      {photoPreviewUrl ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setPhotoPreviewUrl(null)}>
                Fechar
              </Button>
            </div>
            <img src={photoPreviewUrl} alt="Prova da claim" className="max-h-[75vh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </Card>
  )
}

