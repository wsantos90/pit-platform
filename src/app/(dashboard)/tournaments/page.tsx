import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TournamentsListClient } from './TournamentsListClient';

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
    .eq('manager_id', user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Corujões</h1>
        <p className="text-sm text-muted-foreground">
          Torneios mata-mata diários. Inscreva-se, pague via PIX e dispute o campeonato.
        </p>
      </header>
      <TournamentsListClient userClubId={club?.id ?? null} />
    </div>
  );
}
