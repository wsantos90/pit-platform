import type { NotificationType } from "@/types/database"

type NotificationPreferenceOption = {
  type: NotificationType
  label: string
  description: string
}

export const NOTIFICATION_PREFERENCE_OPTIONS: NotificationPreferenceOption[] = [
  {
    type: "claim_approved",
    label: "Claim aprovada",
    description: "Avisa quando a reivindicacao do time for aprovada.",
  },
  {
    type: "claim_rejected",
    label: "Claim rejeitada",
    description: "Mostra o motivo quando a reivindicacao for recusada.",
  },
  {
    type: "match_found",
    label: "Match encontrado",
    description: "Notifica quando o matchmaking encontrar um confronto.",
  },
  {
    type: "match_expired",
    label: "Match expirado",
    description: "Avisa quando um confronto perder o prazo de confirmacao.",
  },
  {
    type: "tournament_confirmed",
    label: "Torneio confirmado",
    description: "Informa quando um torneio confirmar as inscricoes e bracket.",
  },
  {
    type: "tournament_cancelled",
    label: "Torneio cancelado",
    description: "Avisa quando um torneio for cancelado.",
  },
  {
    type: "payment_due",
    label: "Pagamento pendente",
    description: "Lembra que existe um pagamento pendente para concluir.",
  },
  {
    type: "payment_overdue",
    label: "Pagamento em atraso",
    description: "Alerta quando o prazo do pagamento expirar.",
  },
  {
    type: "team_discovered",
    label: "Time encontrado",
    description: "Informa quando um time buscado entrar na base do PIT.",
  },
  {
    type: "dispute_update",
    label: "Atualizacao de disputa",
    description: "Mostra mudancas importantes em disputas abertas.",
  },
  {
    type: "roster_invite",
    label: "Convite de elenco",
    description: "Avisa quando um clube enviar convite para entrar no elenco.",
  },
  {
    type: "general",
    label: "Avisos gerais",
    description: "Mensagens gerais do sistema que nao entram em outra categoria.",
  },
]

export const NOTIFICATION_TYPES = NOTIFICATION_PREFERENCE_OPTIONS.map((option) => option.type)
