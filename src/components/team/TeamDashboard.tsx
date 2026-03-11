import type { ClubStats } from '@/app/(dashboard)/team/page'

type StatCardProps = {
  icon: string
  iconColor: string
  iconBg: string
  label: string
  value: string
  trend?: string
  trendPositive?: boolean
}

function StatCard({ icon, iconColor, iconBg, label, value, trend, trendPositive }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-border p-5"
      style={{ background: 'rgba(var(--card) / 0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`size-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <span className={`material-symbols-outlined text-xl ${iconColor}`}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-sm font-bold ${trendPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <h3 className="text-2xl font-black text-foreground">{value}</h3>
    </div>
  )
}

type Props = {
  stats: ClubStats
}

export function TeamDashboard({ stats }: Props) {
  const { activeCount, avgRating, avgGoalsPerMatch, totalMatches } = stats

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon="group"
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10"
        label="Total de Atletas"
        value={`${activeCount} Ativos`}
      />
      <StatCard
        icon="sports_soccer"
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10"
        label="Média de Gols/Jogo"
        value={avgGoalsPerMatch !== null ? avgGoalsPerMatch.toFixed(1) : '—'}
      />
      <StatCard
        icon="star"
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
        label="Rating Geral"
        value={avgRating !== null ? avgRating.toFixed(1) : '—'}
      />
      <StatCard
        icon="sports_score"
        iconColor="text-violet-500"
        iconBg="bg-violet-500/10"
        label="Partidas Registradas"
        value={String(totalMatches)}
      />
    </div>
  )
}
