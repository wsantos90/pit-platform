import { redirect, notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EnrollButton } from '@/components/tournament/EnrollButton';

// Heavy components loaded dynamically (bundle optimization)
const BracketView = dynamic(
  () => import('@/components/tournament/BracketView').then((m) => ({ default: m.BracketView })),
  { loading: () => <p className="text-sm text-muted-foreground">Carregando bracket...</p> }
);
const HallOfFameCard = dynamic(
  () => import('@/components/tournament/HallOfFameCard').then((m) => ({ default: m.HallOfFameCard })),
  { loading: () => <p className="text-sm text-muted-foreground">Carregando Hall of Fame...</p> }
);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Inscrições abertas',
  confirmed: 'Confirmado',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, { border: string; bg: string; color: string; glow: string }> = {
  open:        { border: 'rgba(34,197,94,0.5)',  bg: 'rgba(34,197,94,0.08)',  color: '#4ade80', glow: '0 0 10px rgba(34,197,94,0.25)' },
  confirmed:   { border: 'rgba(59,130,246,0.5)', bg: 'rgba(59,130,246,0.08)', color: '#60a5fa', glow: '0 0 10px rgba(59,130,246,0.3)' },
  in_progress: { border: 'rgba(234,179,8,0.5)',  bg: 'rgba(234,179,8,0.08)',  color: '#facc15', glow: '0 0 10px rgba(234,179,8,0.25)' },
  finished:    { border: 'rgba(59,130,246,0.5)', bg: 'rgba(59,130,246,0.08)', color: '#60a5fa', glow: '0 0 10px rgba(59,130,246,0.3)' },
  cancelled:   { border: 'rgba(239,68,68,0.5)',  bg: 'rgba(239,68,68,0.08)',  color: '#f87171', glow: '0 0 10px rgba(239,68,68,0.2)' },
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  // Parallel fetch: tournament + entries + user's club
  const [tournamentRes, entriesRes, clubRes] = await Promise.all([
    admin
      .from('tournaments')
      .select('id, name, type, format, status, capacity_min, capacity_max, scheduled_date, start_time, entry_fee, prize_pool, current_round')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('tournament_entries')
      .select('id, club_id, payment_status, final_position')
      .eq('tournament_id', id),
    admin
      .from('clubs')
      .select('id')
      .eq('manager_id', user.id)
      .maybeSingle(),
  ]);

  if (!tournamentRes.data) notFound();

  const tournament = tournamentRes.data;
  const entries = entriesRes.data ?? [];
  const userClubId = clubRes.data?.id ?? null;

  const paidCount = entries.filter((e) => e.payment_status === 'paid').length;

  // Get club names for participant list
  const clubIds = entries.map((e) => e.club_id).filter(Boolean) as string[];
  let clubNames = new Map<string, string>();
  if (clubIds.length > 0) {
    const { data: clubs } = await admin
      .from('clubs')
      .select('id, display_name')
      .in('id', clubIds);
    clubNames = new Map((clubs ?? []).map((c) => [c.id, c.display_name]));
  }

  const paidEntries = entries
    .filter((e) => e.payment_status === 'paid')
    .map((e) => ({ ...e, club_name: e.club_id ? (clubNames.get(e.club_id) ?? '—') : '—' }))
    .sort((a, b) => (a.final_position ?? 99) - (b.final_position ?? 99));

  const isLive = ['confirmed', 'in_progress'].includes(tournament.status);
  const showBracket = ['confirmed', 'in_progress', 'finished'].includes(tournament.status);
  const showHoF = tournament.status === 'finished';

  const formatDate = (date: string, time: string) => {
    const [h, m] = time.split(':');
    return new Date(`${date}T${h}:${m}:00`).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    }) + ` às ${h}:${m}`;
  };

  const statusStyle = STATUS_COLORS[tournament.status];

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8"
      style={{
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      {/* Header */}
      <header
        className="flex flex-col gap-3 px-5 py-5 relative overflow-hidden"
        style={{
          border: '1px solid rgba(59,130,246,0.15)',
          background: 'rgba(10,14,26,0.7)',
          boxShadow: 'inset 0 0 40px rgba(59,130,246,0.03)',
        }}
      >
        {/* Corner accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 32, height: 32,
          borderTop: '2px solid rgba(59,130,246,0.6)',
          borderLeft: '2px solid rgba(59,130,246,0.6)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 32, height: 32,
          borderBottom: '2px solid rgba(59,130,246,0.6)',
          borderRight: '2px solid rgba(59,130,246,0.6)',
        }} />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            {tournament.name}
          </h1>
          {statusStyle ? (
            <span
              className="text-xs font-mono px-2 py-1 tracking-widest"
              style={{
                border: `1px solid ${statusStyle.border}`,
                background: statusStyle.bg,
                color: statusStyle.color,
                boxShadow: statusStyle.glow,
              }}
            >
              {STATUS_LABELS[tournament.status] ?? tournament.status}
            </span>
          ) : null}
        </div>

        <p className="text-sm font-mono" style={{ color: '#64748b' }}>
          {formatDate(tournament.scheduled_date, tournament.start_time)}
        </p>

        <div className="flex gap-5 text-xs font-mono flex-wrap" style={{ color: '#64748b' }}>
          <span>
            TAXA <span className="ml-1" style={{ color: '#60a5fa' }}>R$ {tournament.entry_fee.toFixed(2)}</span>
          </span>
          <span>
            TIMES <span className="ml-1" style={{ color: '#e2e8f0' }}>{paidCount}/{tournament.capacity_max}</span>
          </span>
          {tournament.prize_pool ? (
            <span>
              PREMIAÇÃO <span className="ml-1" style={{ color: '#facc15' }}>R$ {tournament.prize_pool.toFixed(2)}</span>
            </span>
          ) : null}
        </div>
      </header>

      {/* Enroll button */}
      {tournament.status === 'open' && userClubId ? (
        <div className="max-w-xs">
          <EnrollButton tournamentId={id} clubId={userClubId} entryFee={tournament.entry_fee} />
        </div>
      ) : null}

      {/* Hall of Fame */}
      {showHoF ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 3, height: 18, background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <h2 className="text-sm font-mono font-bold tracking-widest" style={{ color: '#60a5fa' }}>
              HALL OF FAME
            </h2>
          </div>
          <Suspense fallback={<p className="text-xs font-mono" style={{ color: '#3b82f6' }}>CARREGANDO...</p>}>
            <HallOfFameCard tournamentId={id} />
          </Suspense>
        </section>
      ) : null}

      {/* Bracket */}
      {showBracket ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 3, height: 18, background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <h2 className="text-sm font-mono font-bold tracking-widest" style={{ color: '#60a5fa' }}>
              CHAVEAMENTO
            </h2>
          </div>
          <Suspense fallback={<p className="text-xs font-mono" style={{ color: '#3b82f6' }}>CARREGANDO...</p>}>
            <BracketView tournamentId={id} isLive={isLive} />
          </Suspense>
        </section>
      ) : null}

      {/* Participants */}
      {paidEntries.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 3, height: 18, background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
            <h2 className="text-sm font-mono font-bold tracking-widest" style={{ color: '#60a5fa' }}>
              PARTICIPANTES
            </h2>
          </div>
          <div style={{ border: '1px solid rgba(59,130,246,0.15)', overflow: 'hidden' }}>
            {paidEntries.map((e, i) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(59,130,246,0.08)' : 'none',
                  background: e.final_position === 1 ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}
              >
                <span style={{ color: e.final_position === 1 ? '#60a5fa' : '#e2e8f0', fontWeight: e.final_position === 1 ? 600 : 400 }}>
                  {e.club_name}
                </span>
                {e.final_position === 1 ? (
                  <span
                    className="text-xs font-mono px-2 py-0.5 tracking-widest"
                    style={{
                      border: '1px solid rgba(59,130,246,0.5)',
                      background: 'rgba(59,130,246,0.1)',
                      color: '#60a5fa',
                      boxShadow: '0 0 8px rgba(59,130,246,0.2)',
                    }}
                  >
                    CAMPEÃO
                  </span>
                ) : e.final_position === 2 ? (
                  <span
                    className="text-xs font-mono px-2 py-0.5 tracking-widest"
                    style={{ border: '1px solid rgba(100,116,139,0.4)', color: '#64748b' }}
                  >
                    VICE
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
