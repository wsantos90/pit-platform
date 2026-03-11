import type { MatchRow } from '@/app/(dashboard)/team/page'

type ResultBadgeProps = {
  result: 'win' | 'draw' | 'loss'
}

const RESULT_LABEL = { win: 'V', draw: 'E', loss: 'D' }
const RESULT_CLASS = {
  win: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  draw: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  loss: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
}

function ResultBadge({ result }: ResultBadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded font-black text-xs ${RESULT_CLASS[result]}`}>
      {RESULT_LABEL[result]}
    </span>
  )
}

function OpponentAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="size-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
      {initial}
    </div>
  )
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  championship: 'Campeonato',
  friendly_pit: 'Amistoso PIT',
  friendly_external: 'Amistoso',
}

type Props = {
  matches: MatchRow[]
  clubId: string
}

export function MatchHistoryTable({ matches, clubId }: Props) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <span className="material-symbols-outlined text-4xl">sports_soccer</span>
        <p className="text-sm">Nenhuma partida registrada.</p>
      </div>
    )
  }

  // Summarize recent form (last 5 matches)
  const recentForm = matches.slice(0, 5).map((m) => {
    const isHome = m.home_club_id === clubId
    const scored = isHome ? m.home_score : m.away_score
    const conceded = isHome ? m.away_score : m.home_score
    if (scored > conceded) return 'win'
    if (scored === conceded) return 'draw'
    return 'loss'
  }) as Array<'win' | 'draw' | 'loss'>

  return (
    <div className="flex flex-col gap-4">
      {/* Forma recente */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">Forma recente</span>
        <div className="flex gap-1.5">
          {recentForm.map((r, i) => (
            <ResultBadge key={i} result={r} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Adversário
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Resultado
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tipo
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                Placar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.map((m) => {
              const isHome = m.home_club_id === clubId
              const opponentName = isHome ? m.away_club_name : m.home_club_name
              const scored = isHome ? m.home_score : m.away_score
              const conceded = isHome ? m.away_score : m.home_score
              const result: 'win' | 'draw' | 'loss' =
                scored > conceded ? 'win' : scored === conceded ? 'draw' : 'loss'
              const matchDate = new Date(m.match_timestamp)
              const dateStr = matchDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              const timeStr = matchDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{dateStr}</span>
                      <span className="text-xs text-muted-foreground">{timeStr}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <OpponentAvatar name={opponentName} />
                      <span className="font-semibold text-foreground text-sm">{opponentName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ResultBadge result={result} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground">
                      {MATCH_TYPE_LABEL[m.match_type] ?? m.match_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-black text-foreground tabular-nums">
                      {scored} <span className="text-muted-foreground font-normal">×</span> {conceded}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          Mostrando {matches.length} de {matches.length} partidas recentes
        </div>
      </div>
    </div>
  )
}
