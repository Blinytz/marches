# DATABASE.md · Marchés

Projet Supabase partagé de l'écosystème (`eclats`, réf `psutbulpezfdftmaqkoo`). Les tables de
l'app cohabitent avec celles des autres apps ; préfixe `mk_` pour éviter les collisions.
Liste normative : section 15 du hand-off. Migrations SQL dans `sql/` (Phase B+).

## Existant partagé (ne pas dupliquer)

- `eclats_ledger` : portefeuille central (`user_id, amount signé, source, reference_id,
  created_at`). Solde = somme. Écriture uniquement via fonctions SECURITY DEFINER.
  Extension prévue Phase C : `idempotency_key text unique` nullable (D-003).
- `auth.users` : compte unique de l'utilisateur, commun à toutes les apps.

## Tables prévues (préfixées `mk_`)

Référentiel externe : `mk_events`, `mk_markets`, `mk_outcomes`, `mk_tags`, `mk_market_tags`,
`mk_topics` (taxonomie canonique française), `mk_topic_mappings`, `mk_market_topics`,
`mk_market_regions`, `mk_price_snapshots`, `mk_sync_runs`, `mk_realtime_events` (rétention
courte), `mk_resolution_records`.

Utilisateur : `mk_preferences`, `mk_favorites` (événements et marchés), `mk_topic_follows`,
`mk_region_follows`, `mk_muted`, `mk_saved_filters`, `mk_feed_interactions`,
`mk_notification_prefs`, `mk_notifications`, `mk_push_subscriptions`.

Configuration : `mk_settings`, `mk_setting_versions`, catalogue initial de la section 9.10.

Trading : `mk_orders`, `mk_trades`, `mk_positions`, `mk_position_lots`, `mk_settlements`,
`mk_payout_claims`, `mk_portfolio_snapshots`.

## Contraintes essentielles (section 15)

- Unicité `(source, external_id)` sur `mk_markets` et `mk_events`.
- Unicité des clés d'idempotence (ledger, settlements, claims).
- Un settlement par résolution source ; un claim par (user, settlement) ; un crédit ledger par claim.
- `numeric(24,8)` pour parts et prix unitaires ; montants non négatifs où pertinent.
- RLS sur toutes les tables utilisateur ; écriture référentiel réservée au rôle service.
- Aucune suppression en cascade du ledger ; soft delete des marchés disparus.
- Versions de réglages immuables dès qu'un ordre ou lot les référence.
