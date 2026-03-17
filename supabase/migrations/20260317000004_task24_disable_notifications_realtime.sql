-- ============================================================
-- MIGRATION TASK 24: DISABLE REALTIME REPLICATION FOR NOTIFICATIONS
-- Polling replaces postgres_changes to avoid WAL/replication overhead.
-- ============================================================

ALTER TABLE public.notifications REPLICA IDENTITY DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END
$$;
