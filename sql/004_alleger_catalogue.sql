-- Marchés · allègement du catalogue (12 août 2026)
--
-- Pourquoi : le projet Supabase partagé occupait 1 420 Mo pour une limite de
-- 500 Mo sur le plan gratuit, et Supabase l'a basculé en LECTURE SEULE. Deux
-- causes, mesurées :
--
--   1. les payloads bruts des sources, conservés intégralement :
--        mk_events    613 Mo dont 555 Mo de payloads
--        mk_markets   606 Mo dont 547 Mo de payloads
--        mk_outcomes  175 Mo, payloads stockés en ligne
--      Ils ne servaient qu'à trois dates de création lues par la PWA. On les
--      promeut en colonne `created_source_at`, puis on vide les payloads.
--
--   2. l'accumulation sans fin des marchés périmés : 5 334 nouveaux marchés
--      par jour, 36 896 stockés, dont 1 339 seulement encore vivants. La PWA
--      ne lit que ces derniers (`status = OPEN and unavailable_at is null`).
--      Rétention retenue : 7 jours après la disparition d'un marché.
--
-- Migration additive et rejouable. Elle ne touche ni `eclats_ledger`, ni les
-- tables de portefeuille, ni aucune donnée utilisateur. Un marché portant une
-- position ou une transaction n'est jamais supprimé : la fonction de purge
-- l'exclut, et les clés étrangères le refuseraient de toute façon.
--
-- IMPORTANT · chaque bloc est à lancer d'un seul « Run ».
-- La levée du mode lecture seule ne vaut que pour la session en cours, d'où sa
-- répétition en tête de chaque bloc. Un bloc découpé échoue avec « cannot
-- execute ... in a read-only transaction ».
--
-- Les deux commandes de levée sont nécessaires, et dans cet ordre :
--   `set default_transaction_read_only = 'off'` ne règle que les transactions
--   suivantes, or l'éditeur SQL de Supabase enveloppe le bloc entier dans une
--   seule transaction, déjà ouverte en lecture seule. Seul `set transaction
--   read write` agit sur la transaction en cours. PostgreSQL n'autorise ce
--   basculement qu'au tout début d'une transaction de premier niveau : ces deux
--   lignes doivent donc rester les premières du bloc.
-- Un « SET TRANSACTION can only be used in transaction blocks » en
-- avertissement est sans conséquence : la première commande a alors suffi.
--
-- IMPORTANT · ordre des opérations, vérifié :
--   1. mettre le workflow « Synchroniser le catalogue Marchés » en pause,
--      sinon les marchés reviennent au créneau suivant ;
--   2. exécuter les blocs 1, 2 puis 3 de ce script ;
--   3. seulement ensuite, déployer la PWA et le collecteur. Le client lit
--      `created_source_at` : déployé avant le bloc 1, il reçoit une erreur 400
--      « column mk_markets.created_source_at does not exist » et le catalogue
--      reste vide ;
--   4. réactiver le workflow.
-- Entre les étapes 2 et 3, l'ancien client lit un payload vide et se replie sur
-- `first_seen_at` : il n'échoue pas.

-- ---------------------------------------------------------------------------
-- Étape 0 · mesurer avant, pour comparer après
-- ---------------------------------------------------------------------------
-- Ces requêtes ne font que lire : elles fonctionnent même en mode lecture
-- seule.
--
-- select relname as objet,
--        pg_size_pretty(pg_total_relation_size(c.oid)) as total,
--        pg_size_pretty(pg_relation_size(c.oid)) as lignes,
--        pg_size_pretty(coalesce(pg_total_relation_size(c.reltoastrelid), 0)) as payloads,
--        pg_size_pretty(pg_indexes_size(c.oid)) as index
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r'
--  order by pg_total_relation_size(c.oid) desc
--  limit 15;
--
-- select pg_size_pretty(pg_database_size(current_database())) as base;


-- ===========================================================================
-- BLOC 1 · la colonne de date et l'outil de purge. Un seul Run.
-- ===========================================================================

set default_transaction_read_only = 'off';
set transaction read write;

alter table public.mk_markets
  add column if not exists created_source_at timestamptz;

comment on column public.mk_markets.created_source_at is
  'Date de création annoncée par la source. Remplace la lecture de raw_payload.';

-- Purge du catalogue périmé. Bornée à 10 000 marchés par appel pour ne pas
-- dépasser le délai d'exécution : la rappeler tant qu'elle ne renvoie pas 0.
-- Le collecteur l'appelle à chaque synchronisation, ce qui suffit ensuite à
-- tenir le catalogue à sa taille de croisière.
--
-- Un marché n'est supprimé que s'il réunit trois conditions : il a disparu des
-- sources (`unavailable_at` renseigné), il n'a plus été vu depuis la durée de
-- rétention, et il ne porte ni position ni transaction. Ses issues, et les
-- relevés de prix de ces issues, suivent par cascade.
create or replace function public.mk_purger_catalogue(p_jours integer default 7)
returns table (marches bigint, evenements bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  limite timestamptz := now() - make_interval(days => greatest(p_jours, 1));
  n_marches bigint;
  n_evenements bigint;
begin
  with condamnes as (
    select m.id
      from public.mk_markets m
     where m.unavailable_at is not null
       and m.last_seen_at < limite
       and not exists (select 1 from public.mk_positions p where p.market_id = m.id)
       and not exists (select 1 from public.mk_trades t where t.market_id = m.id)
     order by m.id
     limit 10000
  ), supprimes as (
    delete from public.mk_markets m
     using condamnes c
     where m.id = c.id
    returning m.id
  )
  select count(*) into n_marches from supprimes;

  -- Un événement ne survit que s'il porte encore au moins un marché.
  with orphelins as (
    select e.id
      from public.mk_events e
     where e.last_seen_at < limite
       and not exists (select 1 from public.mk_markets m where m.event_id = e.id)
     order by e.id
     limit 10000
  ), supprimes as (
    delete from public.mk_events e
     using orphelins o
     where e.id = o.id
    returning e.id
  )
  select count(*) into n_evenements from supprimes;

  return query select n_marches, n_evenements;
end;
$$;

revoke all on function public.mk_purger_catalogue(integer) from public;
revoke all on function public.mk_purger_catalogue(integer) from anon, authenticated;
grant execute on function public.mk_purger_catalogue(integer) to service_role;


-- Soupape de sécurité du collecteur : il lit cette taille avant d'écrire, et
-- suspend l'écriture du catalogue au-delà de 450 Mo plutôt que de laisser
-- Supabase passer le projet en lecture seule à 500 Mo.
create or replace function public.mk_taille_base()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select pg_database_size(current_database());
$$;

revoke all on function public.mk_taille_base() from public;
revoke all on function public.mk_taille_base() from anon, authenticated;
grant execute on function public.mk_taille_base() to service_role;


-- ===========================================================================
-- BLOC 2 · vider le catalogue périmé. À relancer tant que le résultat n'est
-- pas « 0 | 0 ». Au 12 août 2026, environ 5 800 marchés dépassent les 7 jours,
-- soit un ou deux passages : la borne de 10 000 sert au régime de croisière.
-- ===========================================================================

set default_transaction_read_only = 'off';
set transaction read write;

select * from public.mk_purger_catalogue(7);


-- ===========================================================================
-- BLOC 3 · les payloads et la rétention des relevés. Un seul Run.
-- ===========================================================================

set default_transaction_read_only = 'off';
set transaction read write;

-- NOTE D'EXÉCUTION, 15 août 2026 · la reprise des dates ci-dessous a été
-- ABANDONNÉE en production. Extraire trois champs obligeait à lire 2,7 Go de
-- payloads, ce que l'éditeur SQL ne laisse pas le temps de faire, et le jeu n'en
-- valait pas la chandelle : sur 36 700 marchés, 1 580 étaient vivants et ont
-- récupéré leur date à la synchronisation suivante ; les autres étaient promis
-- à la purge. Les trois réécritures ont donc été lancées seules, une par
-- exécution. Résultat : 1 420 Mo ramenés à 167 Mo.
--
-- Reprise des dates de création avant de jeter les payloads. Polymarket publie
-- une date ISO (`createdAt` ou `creationDate`), Manifold un horodatage epoch en
-- millisecondes (`createdTime`). Une valeur illisible vaut null : la PWA se
-- replie alors sur `first_seen_at`.
create or replace function public.mk_date_creation(p jsonb)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := coalesce(nullif(p->>'createdAt', ''), nullif(p->>'creationDate', ''));
  if v is not null then
    begin
      return v::timestamptz;
    exception when others then
      return null;
    end;
  end if;
  v := nullif(p->>'createdTime', '');
  if v ~ '^[0-9]+$' then
    return to_timestamp(v::bigint / 1000.0);
  end if;
  return null;
end;
$$;

update public.mk_markets
   set created_source_at = public.mk_date_creation(raw_payload)
 where created_source_at is null
   and raw_payload <> '{}'::jsonb;

drop function if exists public.mk_date_creation(jsonb);

-- `alter column ... type ... using` réécrit chaque table et abandonne l'ancien
-- stockage : la place des payloads et celle des lignes purgées au bloc 2 sont
-- rendues d'un coup, sans `vacuum full`. La colonne est conservée, vide, pour
-- ne casser aucune écriture existante.
alter table public.mk_events   alter column raw_payload type jsonb using '{}'::jsonb;
alter table public.mk_markets  alter column raw_payload type jsonb using '{}'::jsonb;
alter table public.mk_outcomes alter column raw_payload type jsonb using '{}'::jsonb;

-- Les relevés de prix grossissent de ~1,9 Mo par jour et ne sont lus par
-- personne aujourd'hui. Le collecteur applique désormais la même purge à
-- chaque synchronisation ; ces deux commandes rattrapent l'existant.
delete from public.mk_price_snapshots where recorded_at < now() - interval '90 days';
delete from public.mk_sync_runs        where started_at < now() - interval '30 days';

analyze public.mk_events;
analyze public.mk_markets;
analyze public.mk_outcomes;
analyze public.mk_price_snapshots;
analyze public.mk_sync_runs;

-- La levée du verrou faite en tête de bloc ne vaut que pour cette session : le
-- mode lecture seule est posé par Supabase au niveau du projet. Une fois la
-- taille redescendue sous la limite, il est levé par leur contrôle périodique.
-- S'il persiste, redémarrer le projet depuis Settings puis General.


-- ===========================================================================
-- BLOC 4 · facultatif, à lancer SEUL dans un onglet vide
-- ===========================================================================
-- `vacuum` ne peut pas s'exécuter dans une transaction : si l'éditeur SQL le
-- refuse avec « VACUUM cannot run inside a transaction block », c'est sans
-- conséquence, le bloc 3 a déjà rendu l'essentiel de la place.
--
-- vacuum;
--
-- Puis vérifier :
--
-- select count(*) as marches,
--        count(*) filter (where unavailable_at is null) as vivants,
--        count(*) filter (where raw_payload <> '{}'::jsonb) as payloads_restants,
--        count(*) filter (where created_source_at is not null) as dates_reprises
--   from public.mk_markets;
