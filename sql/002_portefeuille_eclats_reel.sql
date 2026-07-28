-- Marchés : portefeuille réel adossé au registre commun des Éclats.
-- Additive, rejouable, aucune suppression ni réécriture du ledger.
begin;

do $$
begin
  if to_regprocedure('public.eclats_balance()') is null then
    raise exception 'Le registre commun des Éclats doit être installé avant Marchés.';
  end if;
end $$;

create table if not exists public.mk_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  market_id bigint not null references public.mk_markets(id),
  outcome_id bigint not null references public.mk_outcomes(id),
  shares numeric(24,8) not null check (shares >= 0),
  cost_basis numeric(24,8) not null check (cost_basis >= 0),
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, outcome_id)
);

create table if not exists public.mk_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  position_id uuid references public.mk_positions(id),
  market_id bigint not null references public.mk_markets(id),
  outcome_id bigint not null references public.mk_outcomes(id),
  side text not null check (side in ('BUY', 'SELL')),
  amount numeric(24,8) not null check (amount > 0),
  shares numeric(24,8) not null check (shares > 0),
  unit_price numeric(12,8) not null check (unit_price > 0 and unit_price < 100),
  idempotency_key text not null,
  ledger_id uuid references public.eclats_ledger(id),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.mk_positions enable row level security;
alter table public.mk_trades enable row level security;

drop policy if exists mk_positions_read_own on public.mk_positions;
create policy mk_positions_read_own on public.mk_positions
  for select using (auth.uid() = user_id);
drop policy if exists mk_trades_read_own on public.mk_trades;
create policy mk_trades_read_own on public.mk_trades
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.mk_positions, public.mk_trades from anon, authenticated;
grant select on public.mk_positions, public.mk_trades to authenticated;

create or replace view public.mk_user_positions
with (security_invoker = true)
as
select
  p.id, p.shares, p.cost_basis,
  case when p.shares > 0 then p.cost_basis / p.shares else 0 end as average_price,
  p.opened_at, p.updated_at,
  m.source, m.external_id as market_external_id, m.title as market_title,
  o.external_id as outcome_external_id, o.label as outcome_label, o.probability
from public.mk_positions p
join public.mk_markets m on m.id = p.market_id
join public.mk_outcomes o on o.id = p.outcome_id
where p.shares > 0;

grant select on public.mk_user_positions to authenticated;

create or replace function public.mk_buy(
  p_source text,
  p_market_external_id text,
  p_outcome_external_id text,
  p_amount numeric,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_market mk_markets%rowtype;
  v_outcome mk_outcomes%rowtype;
  v_position mk_positions%rowtype;
  v_existing mk_trades%rowtype;
  v_trade mk_trades%rowtype;
  v_ledger eclats_ledger%rowtype;
  v_balance numeric;
  v_price numeric;
  v_shares numeric;
begin
  if v_user is null then raise exception 'Non authentifié'; end if;
  if p_amount is null or p_amount < 10 or p_amount > 10000 then raise exception 'Mise invalide'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'Clé d''idempotence invalide'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select * into v_existing from mk_trades
  where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then
    select coalesce(sum(amount), 0) into v_balance from eclats_ledger where user_id = v_user;
    return jsonb_build_object('id', v_existing.id, 'montant', v_existing.amount,
      'parts', v_existing.shares, 'prix', v_existing.unit_price, 'balance_after', v_balance,
      'idempotent_replay', true);
  end if;

  select * into v_market from mk_markets
  where source = p_source and external_id = p_market_external_id for share;
  if not found or v_market.status <> 'OPEN' or not v_market.tradable or v_market.unavailable_at is not null then
    raise exception 'Marché fermé ou non négociable';
  end if;
  select * into v_outcome from mk_outcomes
  where market_id = v_market.id and external_id = p_outcome_external_id for share;
  if not found or v_outcome.probability is null or v_outcome.probability <= 0 or v_outcome.probability >= 1 then
    raise exception 'Prix indisponible';
  end if;
  v_price := round(v_outcome.probability * 100, 8);
  v_shares := round(p_amount / v_price, 8);

  select coalesce(sum(amount), 0) into v_balance from eclats_ledger where user_id = v_user;
  if v_balance < p_amount then raise exception 'Solde insuffisant : % Éclats disponibles', v_balance; end if;

  insert into mk_positions(user_id, market_id, outcome_id, shares, cost_basis)
  values (v_user, v_market.id, v_outcome.id, v_shares, p_amount)
  on conflict (user_id, outcome_id) do update
    set shares = mk_positions.shares + excluded.shares,
        cost_basis = mk_positions.cost_basis + excluded.cost_basis,
        updated_at = now()
  returning * into v_position;

  insert into mk_trades(user_id, position_id, market_id, outcome_id, side, amount, shares, unit_price, idempotency_key)
  values (v_user, v_position.id, v_market.id, v_outcome.id, 'BUY', p_amount, v_shares, v_price, p_idempotency_key)
  returning * into v_trade;

  insert into eclats_ledger(user_id, amount, source, reference_id, app_id, kind, reason,
    reference_type, idempotency_key, occurred_at, metadata)
  values (v_user, -p_amount, 'marches_mise', v_trade.id, 'marches', 'spend',
    'Achat ' || v_outcome.label || ' · ' || left(v_market.title, 180),
    'market_trade', p_idempotency_key, now(),
    jsonb_build_object(
      'market_id', v_market.id,
      'market_external_id', v_market.external_id,
      'source', v_market.source,
      'outcome_id', v_outcome.id
    ))
  returning * into v_ledger;
  update mk_trades set ledger_id = v_ledger.id where id = v_trade.id;

  return jsonb_build_object('id', v_trade.id, 'montant', p_amount, 'parts', v_shares,
    'prix', v_price, 'balance_after', v_balance - p_amount, 'idempotent_replay', false);
end $$;

create or replace function public.mk_sell(
  p_position_id uuid,
  p_shares numeric,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_position mk_positions%rowtype;
  v_market mk_markets%rowtype;
  v_outcome mk_outcomes%rowtype;
  v_existing mk_trades%rowtype;
  v_trade mk_trades%rowtype;
  v_ledger eclats_ledger%rowtype;
  v_balance numeric;
  v_price numeric;
  v_amount numeric;
  v_cost_reduction numeric;
begin
  if v_user is null then raise exception 'Non authentifié'; end if;
  if p_shares is null or p_shares <= 0 then raise exception 'Nombre de parts invalide'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'Clé d''idempotence invalide'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select * into v_existing from mk_trades where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then
    select coalesce(sum(amount), 0) into v_balance from eclats_ledger where user_id = v_user;
    return jsonb_build_object('id', v_existing.id, 'montant', v_existing.amount,
      'parts', v_existing.shares, 'prix', v_existing.unit_price, 'balance_after', v_balance,
      'idempotent_replay', true);
  end if;
  select * into v_position from mk_positions where id = p_position_id and user_id = v_user for update;
  if not found or p_shares > v_position.shares then raise exception 'Position ou quantité invalide'; end if;
  select * into v_market from mk_markets where id = v_position.market_id;
  select * into v_outcome from mk_outcomes where id = v_position.outcome_id;
  if v_market.status <> 'OPEN' or not v_market.tradable
    or v_outcome.probability is null or v_outcome.probability <= 0 or v_outcome.probability >= 1 then
    raise exception 'Vente indisponible';
  end if;
  v_price := round(v_outcome.probability * 100, 8);
  v_amount := round(p_shares * v_price, 8);
  v_cost_reduction := round(v_position.cost_basis * (p_shares / v_position.shares), 8);

  update mk_positions set shares = shares - p_shares,
    cost_basis = greatest(0, cost_basis - v_cost_reduction), updated_at = now()
  where id = v_position.id;
  insert into mk_trades(user_id, position_id, market_id, outcome_id, side, amount, shares, unit_price, idempotency_key)
  values (v_user, v_position.id, v_market.id, v_outcome.id, 'SELL', v_amount, p_shares, v_price, p_idempotency_key)
  returning * into v_trade;
  insert into eclats_ledger(user_id, amount, source, reference_id, app_id, kind, reason,
    reference_type, idempotency_key, occurred_at, metadata)
  values (v_user, v_amount, 'marches_vente', v_trade.id, 'marches', 'gain',
    'Vente ' || v_outcome.label || ' · ' || left(v_market.title, 180),
    'market_trade', p_idempotency_key, now(),
    jsonb_build_object(
      'market_id', v_market.id,
      'market_external_id', v_market.external_id,
      'source', v_market.source,
      'outcome_id', v_outcome.id
    ))
  returning * into v_ledger;
  update mk_trades set ledger_id = v_ledger.id where id = v_trade.id;
  select coalesce(sum(amount), 0) into v_balance from eclats_ledger where user_id = v_user;
  return jsonb_build_object('id', v_trade.id, 'montant', v_amount, 'parts', p_shares,
    'prix', v_price, 'balance_after', v_balance, 'idempotent_replay', false);
end $$;

revoke all on function public.mk_buy(text,text,text,numeric,text) from public, anon;
revoke all on function public.mk_sell(uuid,numeric,text) from public, anon;
grant execute on function public.mk_buy(text,text,text,numeric,text) to authenticated;
grant execute on function public.mk_sell(uuid,numeric,text) to authenticated;

commit;
