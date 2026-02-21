with expected_tables as (
  select unnest(array[
    'users','players','clubs','club_players','discovered_clubs','discovered_players',
    'discovery_runs','claims','matches','match_players','lineups','lineup_players',
    'matchmaking_queue','confrontation_chats','confrontation_messages','tournaments',
    'tournament_entries','tournament_brackets','payments','trust_scores','hall_of_fame',
    'notifications','confederations','confederation_clubs','disputes','pit_ratings',
    'pit_rating_history','subscriptions'
  ]) as name
)
select name as missing_table
from expected_tables e
left join pg_catalog.pg_tables t
  on t.schemaname = 'public' and t.tablename = e.name
where t.tablename is null
order by name;

with expected_enums as (
  select unnest(array[
    'user_role','claim_status','club_status','player_position','ea_position_category',
    'match_type','matchmaking_status','confrontation_status','payment_status',
    'tournament_type','tournament_format','tournament_status','subscription_status',
    'subscription_plan','notification_type','dispute_status','hall_of_fame_award','pit_league'
  ]) as name
)
select name as missing_enum
from expected_enums e
left join pg_type t on t.typname = e.name
left join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
where t.typname is null or n.nspname is null
order by name;

with expected_triggers as (
  select * from (values
    ('auth','users','on_auth_user_created'),
    ('public','users','trg_users_updated_at'),
    ('public','clubs','trg_clubs_updated_at'),
    ('public','claims','trg_claims_updated_at'),
    ('public','claims','trg_claim_approved'),
    ('public','clubs','trg_club_create_trust'),
    ('public','confederations','trg_confederations_updated_at'),
    ('public','disputes','trg_disputes_updated_at'),
    ('public','lineups','trg_lineups_updated_at'),
    ('public','matchmaking_queue','trg_mm_queue_updated_at'),
    ('public','payments','trg_payments_updated_at'),
    ('public','pit_ratings','trg_ratings_updated_at'),
    ('public','players','trg_players_updated_at'),
    ('public','subscriptions','trg_subs_updated_at'),
    ('public','tournament_entries','trg_te_updated_at'),
    ('public','tournaments','trg_tournaments_updated_at'),
    ('public','trust_scores','trg_trust_updated_at')
  ) as t(schema_name, table_name, trigger_name)
),
actual_triggers as (
  select n.nspname as schema_name, c.relname as table_name, tg.tgname as trigger_name
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not tg.tgisinternal
)
select e.schema_name, e.table_name, e.trigger_name
from expected_triggers e
left join actual_triggers a
  on a.schema_name = e.schema_name
  and a.table_name = e.table_name
  and a.trigger_name = e.trigger_name
where a.trigger_name is null
order by e.schema_name, e.table_name, e.trigger_name;

select t.tablename as rls_disabled_table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_tables t on t.tablename = c.relname and t.schemaname = n.nspname
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by t.tablename;

with expected_unique_cols as (
  select * from (values
    ('users','email'),
    ('players','ea_gamertag'),
    ('clubs','ea_club_id'),
    ('discovered_clubs','ea_club_id'),
    ('discovered_players','ea_gamertag'),
    ('matches','ea_match_id')
  ) as t(tablename, columnname)
),
unique_cols as (
  select c.relname as tablename, a.attname as columnname
  from pg_index i
  join pg_class c on c.oid = i.indrelid
  join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and i.indisunique
)
select e.tablename, e.columnname
from expected_unique_cols e
left join unique_cols u
  on u.tablename = e.tablename and u.columnname = e.columnname
where u.columnname is null
order by e.tablename, e.columnname;

with expected_constraints as (
  select * from (values
    ('public','club_players','uq_active_player_club'),
    ('public','match_players','uq_match_player'),
    ('public','players','chk_different_positions'),
    ('public','discovered_players','uq_discovered_gamertag')
  ) as t(schema_name, table_name, constraint_name)
)
select e.schema_name, e.table_name, e.constraint_name
from expected_constraints e
left join pg_constraint c
  on c.conname = e.constraint_name
left join pg_class r on r.oid = c.conrelid
left join pg_namespace n on n.oid = r.relnamespace
where c.conname is null or n.nspname <> e.schema_name or r.relname <> e.table_name
order by e.schema_name, e.table_name, e.constraint_name;

with expected_fks as (
  select * from (values
    ('public','users','id','auth','users','id'),
    ('public','players','user_id','public','users','id'),
    ('public','clubs','manager_id','public','users','id'),
    ('public','club_players','club_id','public','clubs','id'),
    ('public','club_players','player_id','public','players','id'),
    ('public','discovered_clubs','claimed_by','public','users','id'),
    ('public','discovered_clubs','promoted_to_club_id','public','clubs','id'),
    ('public','discovered_players','linked_player_id','public','players','id'),
    ('public','discovery_runs','triggered_by','public','users','id'),
    ('public','claims','user_id','public','users','id'),
    ('public','claims','discovered_club_id','public','discovered_clubs','id'),
    ('public','claims','reviewed_by','public','users','id'),
    ('public','matches','home_club_id','public','clubs','id'),
    ('public','matches','away_club_id','public','clubs','id'),
    ('public','matches','tournament_id','public','tournaments','id'),
    ('public','tournament_brackets','match_id','public','matches','id'),
    ('public','match_players','match_id','public','matches','id'),
    ('public','match_players','player_id','public','players','id'),
    ('public','match_players','club_id','public','clubs','id'),
    ('public','lineups','club_id','public','clubs','id'),
    ('public','lineups','match_id','public','matches','id'),
    ('public','lineups','created_by','public','users','id'),
    ('public','lineup_players','lineup_id','public','lineups','id'),
    ('public','lineup_players','player_id','public','players','id'),
    ('public','matchmaking_queue','club_id','public','clubs','id'),
    ('public','matchmaking_queue','queued_by','public','users','id'),
    ('public','matchmaking_queue','matched_with','public','matchmaking_queue','id'),
    ('public','confrontation_chats','queue_entry_a','public','matchmaking_queue','id'),
    ('public','confrontation_chats','queue_entry_b','public','matchmaking_queue','id'),
    ('public','confrontation_chats','club_a_id','public','clubs','id'),
    ('public','confrontation_chats','club_b_id','public','clubs','id'),
    ('public','confrontation_chats','match_id','public','matches','id'),
    ('public','confrontation_messages','chat_id','public','confrontation_chats','id'),
    ('public','confrontation_messages','sender_id','public','users','id'),
    ('public','tournaments','confederation_id','public','confederations','id'),
    ('public','tournaments','created_by','public','users','id'),
    ('public','tournament_entries','tournament_id','public','tournaments','id'),
    ('public','tournament_entries','club_id','public','clubs','id'),
    ('public','tournament_entries','enrolled_by','public','users','id'),
    ('public','tournament_brackets','tournament_id','public','tournaments','id'),
    ('public','tournament_brackets','home_entry_id','public','tournament_entries','id'),
    ('public','tournament_brackets','away_entry_id','public','tournament_entries','id'),
    ('public','tournament_brackets','home_club_id','public','clubs','id'),
    ('public','tournament_brackets','away_club_id','public','clubs','id'),
    ('public','tournament_brackets','winner_entry_id','public','tournament_entries','id'),
    ('public','tournament_brackets','next_bracket_id','public','tournament_brackets','id'),
    ('public','payments','club_id','public','clubs','id'),
    ('public','payments','tournament_id','public','tournaments','id'),
    ('public','payments','user_id','public','users','id'),
    ('public','trust_scores','club_id','public','clubs','id'),
    ('public','hall_of_fame','tournament_id','public','tournaments','id'),
    ('public','hall_of_fame','club_id','public','clubs','id'),
    ('public','hall_of_fame','player_id','public','players','id'),
    ('public','confederations','admin_user_id','public','users','id'),
    ('public','confederation_clubs','confederation_id','public','confederations','id'),
    ('public','confederation_clubs','club_id','public','clubs','id'),
    ('public','disputes','bracket_id','public','tournament_brackets','id'),
    ('public','disputes','tournament_id','public','tournaments','id'),
    ('public','disputes','filed_by_club','public','clubs','id'),
    ('public','disputes','filed_by_user','public','users','id'),
    ('public','disputes','against_club','public','clubs','id'),
    ('public','disputes','resolved_by','public','users','id'),
    ('public','pit_ratings','club_id','public','clubs','id'),
    ('public','pit_rating_history','pit_rating_id','public','pit_ratings','id'),
    ('public','pit_rating_history','match_id','public','matches','id'),
    ('public','notifications','user_id','public','users','id'),
    ('public','subscriptions','user_id','public','users','id'),
    ('public','subscriptions','club_id','public','clubs','id')
  ) as t(schema_name, table_name, column_name, ref_schema, ref_table, ref_column)
),
actual_fks as (
  select tc.table_schema, tc.table_name, kcu.column_name,
         ccu.table_schema as ref_schema, ccu.table_name as ref_table, ccu.column_name as ref_column
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
)
select e.schema_name, e.table_name, e.column_name, e.ref_schema, e.ref_table, e.ref_column
from expected_fks e
left join actual_fks a
  on a.table_schema = e.schema_name
  and a.table_name = e.table_name
  and a.column_name = e.column_name
  and a.ref_schema = e.ref_schema
  and a.ref_table = e.ref_table
  and a.ref_column = e.ref_column
where a.table_name is null
order by e.schema_name, e.table_name, e.column_name;

with expected_not_null as (
  select * from (values
    ('public','users','email'),
    ('public','users','roles'),
    ('public','users','is_active'),
    ('public','users','created_at'),
    ('public','users','updated_at'),
    ('public','players','user_id'),
    ('public','players','ea_gamertag'),
    ('public','players','primary_position'),
    ('public','players','is_free_agent'),
    ('public','players','status'),
    ('public','players','created_at'),
    ('public','players','updated_at'),
    ('public','clubs','ea_club_id'),
    ('public','clubs','ea_name_raw'),
    ('public','clubs','display_name'),
    ('public','clubs','status'),
    ('public','clubs','subscription_plan'),
    ('public','clubs','created_at'),
    ('public','clubs','updated_at'),
    ('public','club_players','club_id'),
    ('public','club_players','player_id'),
    ('public','club_players','joined_at'),
    ('public','club_players','is_active'),
    ('public','club_players','role_in_club'),
    ('public','discovered_clubs','ea_club_id'),
    ('public','discovered_clubs','ea_name_raw'),
    ('public','discovered_clubs','display_name'),
    ('public','discovered_clubs','discovered_at'),
    ('public','discovered_clubs','scan_count'),
    ('public','discovered_clubs','status'),
    ('public','discovered_players','ea_gamertag'),
    ('public','discovered_players','last_seen_at'),
    ('public','discovered_players','matches_seen'),
    ('public','discovery_runs','started_at'),
    ('public','discovery_runs','clubs_scanned'),
    ('public','discovery_runs','clubs_new'),
    ('public','discovery_runs','players_found'),
    ('public','discovery_runs','status'),
    ('public','claims','user_id'),
    ('public','claims','discovered_club_id'),
    ('public','claims','photo_url'),
    ('public','claims','status'),
    ('public','claims','created_at'),
    ('public','claims','updated_at'),
    ('public','matches','ea_match_id'),
    ('public','matches','match_timestamp'),
    ('public','match_players','match_id'),
    ('public','match_players','ea_gamertag'),
    ('public','lineups','club_id'),
    ('public','lineup_players','lineup_id'),
    ('public','lineup_players','player_id'),
    ('public','tournaments','name'),
    ('public','tournaments','type'),
    ('public','tournament_entries','tournament_id'),
    ('public','payments','club_id'),
    ('public','payments','user_id'),
    ('public','notifications','user_id')
  ) as t(schema_name, table_name, column_name)
)
select e.schema_name, e.table_name, e.column_name
from expected_not_null e
left join information_schema.columns c
  on c.table_schema = e.schema_name
  and c.table_name = e.table_name
  and c.column_name = e.column_name
where c.is_nullable <> 'NO'
order by e.schema_name, e.table_name, e.column_name;
