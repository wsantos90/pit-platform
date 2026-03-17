'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRealtime } from '@/hooks/useRealtime';
import { createClient } from '@/lib/supabase/client';

type ChatRow = {
  id: string;
  club_a_id: string;
  club_b_id: string;
  status: 'active' | 'confirmed' | 'expired' | 'cancelled';
  confirmed_by_a: boolean;
  confirmed_by_b: boolean;
  expires_at: string;
  match_id: string | null;
  club_a?: { display_name: string } | null;
  club_b?: { display_name: string } | null;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

interface ConfrontationChatProps {
  chatId: string;
  clubId: string;
  onClose: () => void;
}

export function ConfrontationChat({ chatId, clubId, onClose }: ConfrontationChatProps) {
  const [chat, setChat] = useState<ChatRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadChat = useCallback(async () => {
    const { data } = await supabase
      .from('confrontation_chats')
      .select('*, club_a:clubs!confrontation_chats_club_a_id_fkey(display_name), club_b:clubs!confrontation_chats_club_b_id_fkey(display_name)')
      .eq('id', chatId)
      .single();

    if (data) setChat(data as ChatRow);
  }, [chatId, supabase]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('confrontation_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  }, [chatId, supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      await Promise.all([loadChat(), loadMessages()]);
    };
    init();
  }, [loadChat, loadMessages, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleRealtimeMessage = useCallback((payload: unknown) => {
    const p = payload as { new?: Message };
    if (p.new && p.new.sender_id !== userId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === p.new!.id)) return prev;
        return [...prev, p.new!];
      });
    }
  }, [userId]);

  const handleRealtimeChat = useCallback(() => {
    loadChat();
  }, [loadChat]);

  useRealtime({
    table: 'confrontation_messages',
    event: 'INSERT',
    filter: `chat_id=eq.${chatId}`,
    onPayload: handleRealtimeMessage,
  });

  useRealtime({
    table: 'confrontation_chats',
    filter: `id=eq.${chatId}`,
    onPayload: handleRealtimeChat,
  });

  const sendMessage = async () => {
    if (!messageInput.trim() || !userId) return;
    const text = messageInput.trim();
    if (text.length > 500) return;
    setMessageInput('');

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: userId,
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const { data: inserted } = await supabase
      .from('confrontation_messages')
      .insert({ chat_id: chatId, sender_id: userId, message: text })
      .select()
      .single();

    if (inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (inserted as Message) : m))
      );
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch('/api/matchmaking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      });
      if (res.ok) {
        await loadChat();
      }
    } catch (err) {
      console.error('[ConfrontationChat] confirm error', err);
    } finally {
      setConfirming(false);
    }
  };

  const isClubA = chat?.club_a_id === clubId;
  const myConfirmed = isClubA ? chat?.confirmed_by_a : chat?.confirmed_by_b;
  const opponentConfirmed = isClubA ? chat?.confirmed_by_b : chat?.confirmed_by_a;
  const bothConfirmed = chat?.confirmed_by_a && chat?.confirmed_by_b;
  const isExpired = chat?.status === 'expired' || chat?.status === 'cancelled';

  const clubAName = (chat?.club_a as { display_name?: string } | null)?.display_name ?? 'Clube A';
  const clubBName = (chat?.club_b as { display_name?: string } | null)?.display_name ?? 'Clube B';

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{clubAName}</span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span className="font-semibold text-foreground text-sm">{clubBName}</span>
            {chat?.status === 'active' && (
              <Badge className="border border-yellow-500/30 bg-transparent text-yellow-400">Ativo</Badge>
            )}
            {chat?.status === 'confirmed' && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmado</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-7 px-2 text-xs">
              Fechar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isExpired && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-center text-sm text-red-400">
            Chat Expirado — fechando...
          </div>
        )}

        {bothConfirmed && !isExpired && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center text-sm text-green-400 font-semibold">
            Match Confirmado! Boa partida!
          </div>
        )}

        {/* Messages */}
        <div className="h-64 overflow-y-auto rounded-lg bg-background/50 p-3 space-y-2 border border-border">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-4">
              Nenhuma mensagem ainda. Diga oi!
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isOwn
                      ? 'bg-primary/20 text-primary-foreground border border-primary/30'
                      : 'bg-muted text-foreground border border-border'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isExpired && (
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite uma mensagem..."
              className="flex-1 text-sm"
              maxLength={500}
            />
            <Button size="sm" onClick={sendMessage} disabled={!messageInput.trim()}>
              Enviar
            </Button>
          </div>
        )}

        {/* Confirm presence */}
        {!isExpired && !bothConfirmed && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 border border-border">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                Seu clube:{' '}
                <span className={myConfirmed ? 'text-green-400' : 'text-yellow-400'}>
                  {myConfirmed ? 'Confirmado' : 'Aguardando'}
                </span>
              </p>
              <p>
                Adversario:{' '}
                <span className={opponentConfirmed ? 'text-green-400' : 'text-yellow-400'}>
                  {opponentConfirmed ? 'Confirmado' : 'Aguardando'}
                </span>
              </p>
            </div>
            {!myConfirmed && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {confirming ? 'Confirmando...' : 'Confirmar Presenca'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
