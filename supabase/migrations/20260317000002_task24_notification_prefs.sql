-- ============================================================
-- MIGRATION TASK 24.4: USER NOTIFICATION PREFERENCES
-- ============================================================

CREATE TABLE public.user_notification_prefs (
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  inapp_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, type)
);

CREATE INDEX idx_user_notification_prefs_user
  ON public.user_notification_prefs (user_id);

ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE POLICY "Notif Prefs: user ve proprias" ON public.user_notification_prefs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Notif Prefs: user cria proprias" ON public.user_notification_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Notif Prefs: user atualiza proprias" ON public.user_notification_prefs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Notif Prefs: admin gerencia" ON public.user_notification_prefs
  FOR ALL USING (public.is_admin());
