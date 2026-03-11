'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type PendingInvite = {
  id: string
  club_id: string
  joined_at: string
  club: {
    id: string
    display_name: string
    ea_club_id: string
  } | null
}

type Props = {
  invites: PendingInvite[]
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

export function PendingInvitesCard({ invites }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  if (invites.length === 0) {
    return null
  }

  async function handleInviteAction(inviteId: string, action: 'accept' | 'reject') {
    setActionId(inviteId)
    setFeedback(null)

    try {
      const response = await fetch('/api/clubs/invite/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: payload?.message ?? 'Nao foi possivel responder ao convite.',
        })
        return
      }

      window.dispatchEvent(new CustomEvent('pit:notifications-refresh'))
      setFeedback({
        type: 'success',
        message: payload?.message ?? 'Resposta registrada com sucesso.',
      })
      startTransition(() => router.refresh())
    } catch {
      setFeedback({
        type: 'error',
        message: 'Nao foi possivel responder ao convite.',
      })
    } finally {
      setActionId(null)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-foreground">Convites de elenco</CardTitle>
            <CardDescription>
              Responda aos convites pendentes para entrar em um time.
            </CardDescription>
          </div>
          <Badge className="border-primary/30 bg-primary/10 text-primary">
            {invites.length} pendente{invites.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="space-y-3">
          {invites.map((invite) => {
            const isLoading = actionId === invite.id || isPending

            return (
              <div
                key={invite.id}
                className="rounded-2xl border border-border bg-muted/20 px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {invite.club?.display_name ?? 'Time sem nome'}
                      </p>
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                        Pendente
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      EA Club ID: {invite.club?.ea_club_id ?? 'Nao informado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recebido em{' '}
                      {new Date(invite.joined_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => void handleInviteAction(invite.id, 'reject')}
                    >
                      {isLoading ? 'Processando...' : 'Recusar'}
                    </Button>
                    <Button
                      disabled={isLoading}
                      onClick={() => void handleInviteAction(invite.id, 'accept')}
                    >
                      {isLoading ? 'Processando...' : 'Aceitar convite'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
