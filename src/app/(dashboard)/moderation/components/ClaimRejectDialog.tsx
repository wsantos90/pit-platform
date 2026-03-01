'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface ClaimRejectDialogProps {
  open: boolean
  clubName: string
  loading?: boolean
  initialError?: string | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export default function ClaimRejectDialog({
  open,
  clubName,
  loading = false,
  initialError = null,
  onClose,
  onConfirm,
}: ClaimRejectDialogProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(initialError)
  const handleClose = () => {
    setReason("")
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-lg rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Rejeitar claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground-secondary">
            Informe o motivo da rejeicao para o time <strong>{clubName}</strong>.
          </p>

          <Textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              if (error) setError(null)
            }}
            rows={4}
            className="focus-visible:ring-primary"
            placeholder="Explique por que a reivindicacao foi rejeitada..."
          />

          {error ? (
            <p className="rounded-lg border border-error/40 bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={async () => {
                const trimmed = reason.trim()
                if (trimmed.length < 10) {
                  setError("Motivo deve ter ao menos 10 caracteres.")
                  return
                }
                await onConfirm(trimmed)
              }}
            >
              {loading ? "Rejeitando..." : "Confirmar rejeicao"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

