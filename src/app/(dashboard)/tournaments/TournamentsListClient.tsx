'use client';

import { startTransition, useEffect, useState } from 'react';
import { TournamentCard } from '@/components/tournament/TournamentCard';

type Tournament = {
  id: string;
  name: string;
  status: string;
  scheduled_date: string;
  start_time: string;
  entry_fee: number;
  capacity_min: number;
  capacity_max: number;
  paid_entries_count: number;
  prize_pool?: number | null;
};

type Tab = 'open' | 'active' | 'finished';

const TABS: { id: Tab; label: string; statuses: string[] }[] = [
  { id: 'open', label: 'Abertos', statuses: ['open'] },
  { id: 'active', label: 'Em Andamento', statuses: ['confirmed', 'in_progress'] },
  { id: 'finished', label: 'Finalizados', statuses: ['finished'] },
];

interface TournamentsListClientProps {
  userClubId: string | null;
}

export function TournamentsListClient({ userClubId }: TournamentsListClientProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('open');

  useEffect(() => {
    fetch('/api/tournament')
      .then((r) => r.json())
      .then((data) => setTournaments(data.tournaments ?? []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = TABS.find((t) => t.id === activeTab)
    ?.statuses.flatMap((s) => tournaments.filter((t) => t.status === s)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/40 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => startTransition(() => setActiveTab(tab.id))}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum torneio encontrado nesta categoria.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t} userClubId={userClubId} />
          ))}
        </div>
      )}
    </div>
  );
}
