'use client';

import { memo, useEffect, useState } from 'react';

type BracketMatch = {
  id: string;
  round: string;
  round_order: number;
  match_order: number;
  home_club_name: string | null;
  away_club_name: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_entry_id: string | null;
  winner_club_id: string | null;
  home_entry_id: string | null;
  away_entry_id: string | null;
  home_club_id: string | null;
  away_club_id: string | null;
  status: string;
};

interface BracketViewProps {
  tournamentId: string;
  isLive?: boolean;
}

type RoundGroup = { label: string; matches: BracketMatch[] };

const MatchCard = memo(function MatchCard({ match }: { match: BracketMatch }) {
  const homeWon = match.winner_entry_id != null && match.winner_entry_id === match.home_entry_id;
  const awayWon = match.winner_entry_id != null && match.winner_entry_id === match.away_entry_id;
  const isCompleted = match.status === 'completed';
  const isPending = !match.home_club_name && !match.away_club_name;

  return (
    <div
      className="overflow-hidden min-w-[180px]"
      style={{
        border: '1px solid rgba(59,130,246,0.2)',
        background: 'rgba(10,14,26,0.85)',
        boxShadow: isCompleted ? '0 0 0 1px rgba(59,130,246,0.15), inset 0 0 20px rgba(59,130,246,0.03)' : 'none',
      }}
    >
      {/* Home */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs"
        style={{
          borderBottom: '1px solid rgba(59,130,246,0.12)',
          background: homeWon ? 'rgba(59,130,246,0.12)' : 'transparent',
          color: homeWon ? '#60a5fa' : isPending ? 'rgba(148,163,184,0.4)' : '#e2e8f0',
          fontWeight: homeWon ? 700 : 400,
        }}
      >
        <span className="truncate max-w-[110px] tracking-wide">
          {match.home_club_name ?? 'TBD'}
        </span>
        {isCompleted ? (
          <span className="ml-3 font-mono font-bold tabular-nums" style={{ color: homeWon ? '#60a5fa' : '#64748b' }}>
            {match.home_score ?? 0}
          </span>
        ) : null}
      </div>
      {/* Away */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs"
        style={{
          background: awayWon ? 'rgba(59,130,246,0.12)' : 'transparent',
          color: awayWon ? '#60a5fa' : isPending ? 'rgba(148,163,184,0.4)' : '#e2e8f0',
          fontWeight: awayWon ? 700 : 400,
        }}
      >
        <span className="truncate max-w-[110px] tracking-wide">
          {match.away_club_name ?? 'TBD'}
        </span>
        {isCompleted ? (
          <span className="ml-3 font-mono font-bold tabular-nums" style={{ color: awayWon ? '#60a5fa' : '#64748b' }}>
            {match.away_score ?? 0}
          </span>
        ) : null}
      </div>
    </div>
  );
});

const RoundColumn = memo(function RoundColumn({ round, isLast }: { round: RoundGroup; isLast: boolean }) {
  const label = round.label.replace(/_/g, ' ').toUpperCase();
  return (
    <div className="flex items-stretch gap-0">
      <div className="flex flex-col gap-2 min-w-[190px]">
        {/* Round label */}
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 6, height: 6, background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
          <p className="text-xs font-mono font-semibold tracking-widest" style={{ color: '#3b82f6' }}>
            {label}
          </p>
        </div>
        {round.matches.map((match) => (
          <div key={match.id} className="flex items-center">
            <MatchCard match={match} />
          </div>
        ))}
      </div>
      {/* Connector arrow between rounds */}
      {!isLast ? (
        <div className="flex items-center px-2 self-center">
          <div style={{ width: 20, height: 1, background: 'rgba(59,130,246,0.3)' }} />
          <div style={{
            width: 0, height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderLeft: '5px solid rgba(59,130,246,0.3)',
          }} />
        </div>
      ) : null}
    </div>
  );
});

export function BracketView({ tournamentId, isLive = false }: BracketViewProps) {
  const [rounds, setRounds] = useState<RoundGroup[]>([]);
  const [currentRound, setCurrentRound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBracket = async () => {
    try {
      const res = await fetch(`/api/tournament/bracket?tournament_id=${tournamentId}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();

      const brackets: BracketMatch[] = data.brackets ?? [];
      setCurrentRound(data.currentRound ?? null);

      const grouped = new Map<number, RoundGroup>();
      for (const b of brackets) {
        if (!grouped.has(b.round_order)) {
          grouped.set(b.round_order, { label: b.round, matches: [] });
        }
        grouped.get(b.round_order)!.matches.push(b);
      }

      setRounds(Array.from(grouped.entries()).sort(([a], [b]) => a - b).map(([, g]) => g));
      setError(null);
    } catch {
      setError('Erro ao carregar bracket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBracket();
    if (!isLive) return;
    const interval = setInterval(fetchBracket, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, isLive]);

  if (loading) {
    return (
      <div className="text-xs font-mono text-center py-8" style={{ color: '#3b82f6' }}>
        CARREGANDO DADOS...
      </div>
    );
  }

  if (error) {
    return <div className="text-xs font-mono text-red-400 text-center py-4">{error}</div>;
  }

  if (rounds.length === 0) {
    return (
      <div className="text-xs font-mono text-center py-4" style={{ color: '#64748b' }}>
        BRACKET NÃO GERADO
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {currentRound ? (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-1 tracking-widest"
            style={{
              border: '1px solid rgba(59,130,246,0.4)',
              background: 'rgba(59,130,246,0.08)',
              color: '#60a5fa',
              boxShadow: '0 0 8px rgba(59,130,246,0.15)',
            }}
          >
            RODADA ATUAL: {currentRound.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      ) : null}
      <div className="flex flex-row items-start overflow-x-auto pb-3">
        {rounds.map((round, idx) => (
          <RoundColumn key={round.label} round={round} isLast={idx === rounds.length - 1} />
        ))}
      </div>
    </div>
  );
}
