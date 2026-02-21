-- ============================================================
-- TASK 7: Discovery scan_count atomic increment helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_discovered_club_scan_count(p_ea_club_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.discovered_clubs
  SET scan_count = scan_count + 1
  WHERE ea_club_id = p_ea_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_discovered_club_scan_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_discovered_club_scan_count(text) TO service_role;
