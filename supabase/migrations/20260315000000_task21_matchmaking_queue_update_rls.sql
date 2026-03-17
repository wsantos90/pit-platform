-- Allow managers to update (cancel/modify) their club's queue entries
CREATE POLICY "MM Queue: manager pode atualizar" ON public.matchmaking_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = matchmaking_queue.club_id
        AND clubs.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = matchmaking_queue.club_id
        AND clubs.manager_id = auth.uid()
    )
  );
