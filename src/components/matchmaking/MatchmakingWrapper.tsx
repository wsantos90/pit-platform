'use client';

import { useState } from 'react';
import { QueuePanel } from './QueuePanel';
import { ConfrontationChat } from './ConfrontationChat';

interface MatchmakingWrapperProps {
  clubId: string;
}

export function MatchmakingWrapper({ clubId }: MatchmakingWrapperProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <QueuePanel clubId={clubId} onMatchFound={(chatId) => setActiveChatId(chatId)} />
      {activeChatId && (
        <ConfrontationChat
          chatId={activeChatId}
          clubId={clubId}
          onClose={() => setActiveChatId(null)}
        />
      )}
    </div>
  );
}
