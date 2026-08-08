-- Index de synchronisation.
--
-- La synchro termine chaque passage en marquant « indisponibles » les marchés
-- qui ne sont plus servis par la source. Sans index, ce PATCH parcourt toute
-- la table (plus de 10 000 lignes historiques) et dépasse régulièrement le
-- délai d'exécution imposé par Supabase (erreur 57014), ce qui faisait échouer
-- le workflow plusieurs fois par jour.

create index if not exists mk_markets_source_last_seen_idx
  on public.mk_markets (source, last_seen_at)
  where unavailable_at is null;

-- Les listes du client ne demandent que les marchés encore servis, triés par
-- échéance : même raison, on évite le parcours complet de l'historique.
create index if not exists mk_markets_actifs_close_idx
  on public.mk_markets (close_at)
  where unavailable_at is null;
