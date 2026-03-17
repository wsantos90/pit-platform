'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type EnrollState = 'idle' | 'loading' | 'awaiting_payment' | 'paid' | 'error';

interface EnrollButtonProps {
  tournamentId: string;
  clubId: string;
  entryFee: number;
  onEnrolled?: () => void;
}

export function EnrollButton({ tournamentId, clubId, entryFee, onEnrolled }: EnrollButtonProps) {
  const [state, setState] = useState<EnrollState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixCopy, setPixCopy] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setSecondsLeft(600);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setState((s) => (s === 'awaiting_payment' ? 'error' : s));
          setError('Tempo de pagamento expirado. Tente novamente.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Supabase Realtime: watch payment status
  useEffect(() => {
    if (!paymentId || state !== 'awaiting_payment') return;

    const channel = supabase
      .channel(`payment-${paymentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus === 'paid') {
            clearTimer();
            setState('paid');
            onEnrolled?.();
          } else if (newStatus === 'cancelled') {
            clearTimer();
            setState('error');
            setError('Pagamento cancelado. Tente novamente.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentId, state, supabase, clearTimer, onEnrolled]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleEnroll = async () => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch('/api/tournament/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId, club_id: clubId }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg: Record<string, string> = {
          already_enrolled: 'Seu clube já está inscrito.',
          tournament_full: 'Torneio lotado.',
          tournament_not_open: 'Inscrições encerradas.',
          not_club_manager: 'Apenas o manager pode se inscrever.',
        };
        setState('error');
        setError(msg[data.error] ?? 'Erro ao inscrever. Tente novamente.');
        return;
      }

      setPaymentId(data.paymentId);
      setPixCopy(data.pixCopyPaste ?? null);
      setPixQrCode(data.pixQrCode ?? null);
      setInitPoint(data.initPoint ?? null);
      setState('awaiting_payment');
      startTimer();
    } catch {
      setState('error');
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (state === 'paid') {
    return (
      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center">
        <p className="text-green-400 text-sm font-semibold">✓ Inscrito com sucesso!</p>
      </div>
    );
  }

  if (state === 'awaiting_payment') {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Aguardando pagamento PIX</p>
          <p className="text-primary font-mono text-sm font-semibold">{formatTime(secondsLeft)}</p>
        </div>
        {pixQrCode ? (
          <img
            src={`data:image/png;base64,${pixQrCode}`}
            alt="QR Code PIX"
            className="mx-auto w-40 h-40 rounded"
          />
        ) : null}
        {pixCopy ? (
          <div className="flex gap-2">
            <code className="flex-1 rounded bg-muted p-2 text-xs break-all text-muted-foreground line-clamp-2">
              {pixCopy}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs"
              onClick={() => {
                const copyText = (text: string) => {
                  const el = document.createElement('textarea');
                  el.value = text;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                };
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(pixCopy).catch(() => copyText(pixCopy));
                } else {
                  copyText(pixCopy);
                }
              }}
            >
              Copiar
            </Button>
          </div>
        ) : null}
        {initPoint ? (
          <a
            href={initPoint}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs text-primary hover:underline"
          >
            Abrir no Mercado Pago →
          </a>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={() => { clearTimer(); setState('idle'); setPaymentId(null); }}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="sm"
        onClick={handleEnroll}
        disabled={state === 'loading'}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
      >
        {state === 'loading' ? 'Processando...' : `Inscrever via PIX — R$ ${entryFee.toFixed(2)}`}
      </Button>
      {error ? <p className="text-xs text-red-400 text-center">{error}</p> : null}
    </div>
  );
}
