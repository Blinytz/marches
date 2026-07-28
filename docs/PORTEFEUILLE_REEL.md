# Activer le portefeuille Éclats réel

Marchés utilise le même projet Supabase, la même session `eclats_session` et le
même registre `eclats_ledger` que le reste de l'écosystème.

## Installation

1. Ouvrir le projet Supabase de l'écosystème.
2. Aller dans **SQL Editor**, puis **New query**.
3. Copier tout le contenu de `sql/002_portefeuille_eclats_reel.sql`.
4. Cliquer sur **Run**.
5. Dans une nouvelle requête, exécuter
   `sql/002_portefeuille_eclats_verification.sql`.

La migration est additive et rejouable. Elle ne supprime et ne réécrit aucune
écriture Éclats existante.

## Contrat

- `eclats_balance()` reste la source de vérité du solde.
- Chaque achat crée atomiquement une position, une transaction et une dépense
  dans `eclats_ledger`.
- Chaque vente réduit atomiquement la position et crédite `eclats_ledger`.
- Les prix et le solde sont relus côté serveur au moment de l'opération.
- Les clés d'idempotence empêchent un double débit en cas de nouvelle tentative.
- Les utilisateurs authentifiés ne peuvent lire que leurs propres positions et
  ne peuvent pas écrire directement dans les tables de trading.

Le catalogue réel doit déjà avoir été installé avec
`sql/001_catalogue_reel.sql` et alimenté par la synchronisation GitHub
Actions avant l'exécution de cette migration.
