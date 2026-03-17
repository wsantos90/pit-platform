import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MatchmakingWrapper } from '@/components/matchmaking/MatchmakingWrapper';

export default async function MatchmakingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: club } = await supabase
    .from('clubs')
    .select('id, display_name')
    .eq('manager_id', user.id)
    .maybeSingle();

  if (!club) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Matchmaking</h1>
        </header>
        <p className="text-sm text-muted-foreground">
          Voce precisa ser manager de um clube para usar o matchmaking.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Matchmaking</h1>
        <p className="text-sm text-muted-foreground">
          Entre na fila de confronto e confirme sua presenca para partidas amistosas PIT.
        </p>
      </header>

      <MatchmakingWrapper clubId={club.id} />
    </div>
  );
}
