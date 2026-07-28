-- À exécuter après 002_portefeuille_eclats_reel.sql.
select to_regclass('public.mk_positions') as positions,
       to_regclass('public.mk_trades') as trades,
       to_regclass('public.mk_user_positions') as vue_positions,
       to_regprocedure('public.mk_buy(text,text,text,numeric,text)') as achat,
       to_regprocedure('public.mk_sell(uuid,numeric,text)') as vente,
       to_regprocedure('public.eclats_balance()') as solde_commun;

select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('mk_buy', 'mk_sell', 'eclats_balance')
order by routine_name;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('mk_positions', 'mk_trades')
order by tablename, policyname;
