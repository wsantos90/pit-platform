'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtime } from '@/hooks/useRealtime';
import { createClient } from '@/lib/supabase/client';

// Fixed slots in BRT (UTC-3)
const FIXED_SLOTS = ['20:10', '20:40', '21:10', '21:40', '22:10', '22:40', '23:10', '23:40', '00:00'];

// Unlock time = slot_time BRT + 50 minutes (10 min tolerance + ~12 min game + buffer)
function getUnlockTimeBRT(slotTime: string): Date {
  const [h, m] = slotTime.split(':').map(Number);
  const now = new Date();
  // Build today's date at this slot time in BRT (UTC-3 = UTC+3h)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h + 3, m, 0, 0));
  // If the computed UTC time is more than 12h in the future, it was "yesterday's" slot
  if (d.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  // Add 50 minutes
  return new Date(d.getTime() + 50 * 60 * 1000);
}

function isSlotUnlocked(slotTime: string): boolean {
  return Date.now() >= getUnlockTimeBRT(slotTime).getTime();
}

function isMidnightBRT(): boolean {
  // BRT = UTC-3. Midnight BRT = 03:00 UTC
  const utcHour = new Date().getUTCHours();
  // After 03:00 UTC (00:00 BRT) and before 12:00 UTC (09:00 BRT)
  return utcHour >= 3 && utcHour < 12;
}

function formatUnlockTime(slotTime: string): string {
  const unlock = getUnlockTimeBRT(slotTime);
  // Convert UTC back to BRT for display
  const brtHour = (unlock.getUTCHours() - 3 + 24) % 24;
  const brtMin = unlock.getUTCMinutes();
  return `${String(brtHour).padStart(2, '0')}:${String(brtMin).padStart(2, '0')}`;
}

type QueueEntry = {
  id: string;
  club_id: string;
  slot_time: string;
  status: 'waiting' | 'matched' | 'confirmed' | 'expired' | 'cancelled';
  matched_with: string | null;
  opponent_name?: string;
  chat_id?: string;
};

type ChatRow = {
  id: string;
  club_a_id: string;
  club_b_id: string;
  queue_entry_a: string;
  queue_entry_b: string;
  status: string;
};

type ConfirmedMatchInfo = {
  chatId: string;
  slotTime: string;
  opponentName: string;
  entryId: string;
};

interface QueuePanelProps {
  clubId: string;
  onMatchFound: (chatId: string) => void;
}

function slotStatusBadge(status: QueueEntry['status'] | null) {
  if (!status) return <Badge className="border border-border bg-transparent text-muted-foreground">Livre</Badge>;
  if (status === 'waiting') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Na Fila</Badge>;
  if (status === 'matched' || status === 'confirmed') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Match!</Badge>;
  return <Badge className="border border-border bg-transparent text-muted-foreground">Livre</Badge>;
}

export function QueuePanel({ clubId, onMatchFound }: QueuePanelProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmedMatches, setConfirmedMatches] = useState<ConfirmedMatchInfo[]>([]);
  const [collectingSlot, setCollectingSlot] = useState<string | null>(null);
  const [collectResults, setCollectResults] = useState<Record<string, string>>({});
  const [collectingAll, setCollectingAll] = useState(false);
  const [collectAllResult, setCollectAllResult] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // 1-minute timer to keep `now` updated for unlock countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/matchmaking/queue');
      if (res.ok) {
        const data = await res.json();
        const newEntries: QueueEntry[] = data.entries ?? [];
        setEntries(newEntries);

        // Build confirmedMatches from enriched entries
        const matchedEntries = newEntries.filter(
          (e) => (e.status === 'matched' || e.status === 'confirmed') && e.chat_id
        );

        const infos: ConfirmedMatchInfo[] = matchedEntries.map((e) => ({
          chatId: e.chat_id!,
          slotTime: e.slot_time,
          opponentName: e.opponent_name ?? 'Adversário',
          entryId: e.id,
        }));
        setConfirmedMatches(infos);
      }
    } catch (err) {
      console.error('[QueuePanel] fetch error', err);
    }
  }, []);

  // Check for matched entries and find their chat
  const checkForMatches = useCallback(async (currentEntries: QueueEntry[]) => {
    const matchedEntry = currentEntries.find((e) => e.status === 'matched');
    if (!matchedEntry) return;

    try {
      const supabase = createClient();
      const { data: chat } = await supabase
        .from('confrontation_chats')
        .select('id')
        .or(`queue_entry_a.eq.${matchedEntry.id},queue_entry_b.eq.${matchedEntry.id}`)
        .in('status', ['active', 'confirmed'])
        .maybeSingle();

      if (chat?.id) {
        onMatchFound(chat.id);
      }
    } catch (err) {
      console.error('[QueuePanel] checkForMatches error', err);
    }
  }, [onMatchFound]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 30_000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  useEffect(() => {
    if (entries.length > 0) {
      checkForMatches(entries);
    }
  }, [entries, checkForMatches]);


  const handleRealtimePayload = useCallback(() => {
    fetchEntries();
  }, [fetchEntries]);

  useRealtime({
    table: 'matchmaking_queue',
    filter: `club_id=eq.${clubId}`,
    onPayload: handleRealtimePayload,
  });

  const handleSlotClick = async (slot: string) => {
    const existing = entries.find((e) => e.slot_time === slot && ['waiting', 'matched'].includes(e.status));

    setActionLoading(slot);
    try {
      if (existing) {
        if (existing.status === 'matched') {
          // Reopen the chat instead of leaving queue
          await checkForMatches([existing]);
          return;
        }
        // Leave queue (only for 'waiting' status)
        const res = await fetch('/api/matchmaking/queue', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queue_id: existing.id }),
        });
        if (res.ok) {
          setEntries((prev) => prev.filter((e) => e.id !== existing.id));
        }
      } else {
        // Enter queue
        setLoading(true);
        const res = await fetch('/api/matchmaking/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_time: slot }),
        });
        if (res.ok) {
          await fetchEntries();
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('[QueuePanel] action error', err);
      setLoading(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollect = async (slotTime: string) => {
    setCollectingSlot(slotTime);
    try {
      const res = await fetch('/api/collect/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const n = data.matches_new ?? 0;
        setCollectResults((prev) => ({
          ...prev,
          [slotTime]: n > 0 ? `${n} nova(s) partida(s) coletada(s)!` : 'Nenhuma partida nova ainda.',
        }));
      } else {
        setCollectResults((prev) => ({
          ...prev,
          [slotTime]: data.error ?? 'Erro ao coletar.',
        }));
      }
    } catch {
      setCollectResults((prev) => ({ ...prev, [slotTime]: 'Erro ao coletar.' }));
    } finally {
      setCollectingSlot(null);
    }
  };

  const handleCollectAll = async () => {
    setCollectingAll(true);
    try {
      const res = await fetch('/api/collect/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const n = data.matches_new ?? 0;
        setCollectAllResult(n > 0 ? `${n} nova(s) partida(s) coletada(s)!` : 'Nenhuma partida nova.');
      } else {
        setCollectAllResult(data.error ?? 'Erro ao coletar.');
      }
    } catch {
      setCollectAllResult('Erro ao coletar.');
    } finally {
      setCollectingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">Matchmaking</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione um horario para entrar na fila de confronto
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIXED_SLOTS.map((slot) => {
              const entry = entries.find(
                (e) => e.slot_time === slot && ['waiting', 'matched', 'confirmed'].includes(e.status)
              );
              const isActive = !!entry;
              const isThisLoading = actionLoading === slot;

              return (
                <Button
                  key={slot}
                  variant={isActive ? 'default' : 'outline'}
                  className={`flex h-auto flex-col gap-1 py-3 ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                      : 'border-border bg-card text-foreground hover:border-primary/50'
                  }`}
                  disabled={isThisLoading || loading}
                  onClick={() => handleSlotClick(slot)}
                >
                  <span className="text-base font-semibold">{slot}</span>
                  <span className="text-xs opacity-70">BRT</span>
                  {slotStatusBadge(entry?.status ?? null)}
                  {(entry?.status === 'matched' || entry?.status === 'confirmed') && entry.opponent_name && (
                    <span className="text-xs opacity-80 text-green-400">vs {entry.opponent_name}</span>
                  )}
                </Button>
              );
            })}
          </div>
          {entries.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {entries.filter((e) => e.status === 'waiting').length} slot(s) na fila
            </p>
          )}
        </CardContent>
      </Card>

      {/* Amistosos confirmados com coleta time-locked */}
      {confirmedMatches.length > 0 && (
        <Card className="rounded-xl border border-border bg-card mt-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Amistosos de Hoje</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {confirmedMatches.map((match) => {
              const unlocked = now.getTime() >= getUnlockTimeBRT(match.slotTime).getTime();
              const result = collectResults[match.slotTime];
              return (
                <div key={match.chatId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 border border-border">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      vs {match.opponentName}
                    </span>
                    <span className="text-xs text-muted-foreground">{match.slotTime} BRT</span>
                    {result && <span className="text-xs text-green-400">{result}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant={unlocked ? 'default' : 'outline'}
                    disabled={!unlocked || collectingSlot === match.slotTime}
                    onClick={() => handleCollect(match.slotTime)}
                    className="shrink-0 text-xs"
                  >
                    {collectingSlot === match.slotTime
                      ? 'Coletando...'
                      : unlocked
                      ? 'Coletar Partida'
                      : `Disponível às ${formatUnlockTime(match.slotTime)}`}
                  </Button>
                </div>
              );
            })}

            {isMidnightBRT() && (
              <div className="mt-1 border-t border-border pt-3 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Colete todas as partidas de amistoso de uma vez:</p>
                <Button
                  size="sm"
                  onClick={handleCollectAll}
                  disabled={collectingAll}
                  className="w-full"
                >
                  {collectingAll ? 'Coletando...' : 'Coletar Todos os Amistosos'}
                </Button>
                {collectAllResult && (
                  <p className="text-xs text-green-400">{collectAllResult}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
