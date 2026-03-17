'use client';

import { useEffect, useState } from 'react';
import { Trophy, Star, Target, Zap, Shield, BarChart2, Goal } from 'lucide-react';

type HofAward = {
  award: string;
  club_id: string | null;
  club_name: string | null;
  player_id: string | null;
  ea_gamertag: string | null;
  stat_value: number | null;
};

interface HallOfFameCardProps {
  tournamentId: string;
}

const AWARD_CONFIG: Record<string, { label: string; icon: React.ElementType; statLabel: string }> = {
  champion: { label: 'Campeão', icon: Trophy, statLabel: '' },
  mvp_final: { label: 'MVP da Final', icon: Star, statLabel: 'Rating' },
  top_scorer: { label: 'Artilheiro', icon: Goal, statLabel: 'gols' },
  top_assister: { label: 'Garção', icon: Target, statLabel: 'assists' },
  pitbull: { label: 'Pitbull', icon: Zap, statLabel: 'desarmes' },
  muralha: { label: 'Muralha', icon: Shield, statLabel: 'clean sheets' },
  best_avg_rating: { label: 'Melhor Rating', icon: BarChart2, statLabel: 'avg' },
};

export function HallOfFameCard({ tournamentId }: HallOfFameCardProps) {
  const [awards, setAwards] = useState<HofAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tournament/${tournamentId}/hall-of-fame`)
      .then((r) => r.json())
      .then((data) => setAwards(data.awards ?? []))
      .catch(() => setAwards([]))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-6">Carregando Hall of Fame...</p>;
  }

  if (awards.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Hall of Fame ainda não gerado.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {awards.map((award) => {
        const config = AWARD_CONFIG[award.award];
        if (!config) return null;
        const Icon = config.icon;
        const name = award.award === 'champion'
          ? (award.club_name ?? '—')
          : (award.ea_gamertag ?? award.club_name ?? '—');
        const isChampion = award.award === 'champion';

        return (
          <div
            key={award.award}
            className="flex flex-col gap-2 px-3 py-3 transition-all"
            style={{
              borderLeft: `2px solid ${isChampion ? '#3b82f6' : 'rgba(59,130,246,0.35)'}`,
              background: isChampion ? 'rgba(59,130,246,0.06)' : 'rgba(15,20,35,0.6)',
              boxShadow: isChampion ? '0 0 16px rgba(59,130,246,0.12)' : 'none',
            }}
          >
            <div className="flex items-center gap-2">
              <Icon
                className="h-3.5 w-3.5 flex-shrink-0"
                style={{ color: isChampion ? '#60a5fa' : '#3b82f6' }}
              />
              <span
                className="text-xs font-mono tracking-widest truncate"
                style={{ color: '#64748b' }}
              >
                {config.label.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm truncate" style={{ color: isChampion ? '#60a5fa' : '#e2e8f0' }}>
                {name}
              </p>
              {award.stat_value != null && config.statLabel ? (
                <p className="font-mono text-xs mt-0.5" style={{ color: '#3b82f6' }}>
                  {award.stat_value} {config.statLabel}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
