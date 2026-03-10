-- Storage bucket para provas de claim (fotos enviadas pelo manager)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-proofs',
  'claim-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Usuário autenticado pode fazer upload apenas na própria pasta (uid/)
CREATE POLICY "claim_proofs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Usuário pode ver os próprios uploads; moderadores/admins veem tudo
CREATE POLICY "claim_proofs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND (u.roles @> ARRAY['moderator']::user_role[] OR u.roles @> ARRAY['admin']::user_role[])
      )
    )
  );
