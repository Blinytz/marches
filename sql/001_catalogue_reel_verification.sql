-- À exécuter après 001_catalogue_reel.sql puis après une synchronisation.
select table_name
from information_schema.tables
where table_schema = 'public' and table_name like 'mk_%'
order by table_name;

select source, status, count(*) as markets, max(last_seen_at) as latest_seen
from public.mk_markets
group by source, status
order by source, status;

select count(*) as outcomes from public.mk_outcomes;
select count(*) as snapshots, max(recorded_at) as latest_snapshot from public.mk_price_snapshots;

select status, polymarket_count, manifold_count, market_count, outcome_count,
       snapshot_count, started_at, finished_at, error_summary
from public.mk_sync_runs
order by started_at desc
limit 10;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename like 'mk_%'
order by tablename, policyname;
