'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EnrollButton } from './EnrollButton';

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

interface TournamentCardProps {
  tournament: Tournament;
  userClubId: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Inscrições abertas',
  confirmed: 'Confirmado',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'border-border text-muted-foreground',
  open: 'border-green-500/40 bg-green-500/10 text-green-400',
  confirmed: 'border-primary/40 bg-primary/10 text-primary',
  in_progress: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  finished: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  cancelled: 'border-red-500/40 bg-red-500/10 text-red-400',
};

function formatDate(date: string, time: string) {
  const [h, m] = time.split(':');
  const d = new Date(`${date}T${h}:${m}:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
    ' às ' + `${h}:${m}`;
}

export function TournamentCard({ tournament: t, userClubId }: TournamentCardProps) {
  const progress = Math.min((t.paid_entries_count / t.capacity_max) * 100, 100);
  const vacancies = t.capacity_max - t.paid_entries_count;

  return (
    <Card className="rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/tournaments/${t.id}`} className="hover:text-primary transition-colors">
            <h3 className="font-semibold text-foreground text-sm leading-tight">{t.name}</h3>
          </Link>
          <Badge className={`shrink-0 border text-xs px-2 py-0.5 ${STATUS_COLORS[t.status] ?? ''}`}>
            {STATUS_LABELS[t.status] ?? t.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(t.scheduled_date, t.start_time)}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Taxa: <span className="text-foreground font-medium">R$ {t.entry_fee.toFixed(2)}</span></span>
          <span>
            {t.paid_entries_count}/{t.capacity_max} times
            {vacancies > 0 && t.status === 'open' ? (
              <span className="text-green-400 ml-1">({vacancies} vagas)</span>
            ) : null}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {t.prize_pool && t.prize_pool > 0 ? (
          <p className="text-xs text-muted-foreground">
            Premiação: <span className="text-yellow-400 font-medium">R$ {t.prize_pool.toFixed(2)}</span>
          </p>
        ) : null}

        {t.status === 'open' && userClubId ? (
          <EnrollButton
            tournamentId={t.id}
            clubId={userClubId}
            entryFee={t.entry_fee}
          />
        ) : t.status !== 'open' ? (
          <Link
            href={`/tournaments/${t.id}`}
            className="text-center text-xs text-primary hover:underline"
          >
            Ver detalhes →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
