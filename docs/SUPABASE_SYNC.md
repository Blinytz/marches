# Synchronisation Supabase du catalogue Marchés

## État

Le code est prêt mais la migration n'a pas été exécutée sur le projet partagé et le workflow
n'a pas été activé. Cette activation doit rester manuelle afin de relire le SQL et les droits.

Projet cible : `eclats`, référence `psutbulpezfdftmaqkoo`.

## Installation manuelle

1. Ouvrir l'éditeur SQL du projet Supabase partagé.
2. Relire puis exécuter `sql/001_catalogue_reel.sql`.
3. Exécuter `sql/001_catalogue_reel_verification.sql`.
4. Dans le dépôt GitHub privé `Blinytz/marches`, créer les secrets Actions :
   - `SUPABASE_URL` : URL du projet partagé ;
   - `SUPABASE_SERVICE_KEY` : clé serveur, jamais exposée dans la PWA.
5. Lancer une première fois le workflow `Synchroniser le catalogue Marchés`.
6. Rejouer le script de vérification SQL et contrôler `mk_sync_runs`.

## Commandes locales

Lecture des API et préparation sans écriture ni secret :

```powershell
node scripts/sync_catalogue.mjs
```

Écriture volontaire après installation de la migration :

```powershell
$env:SUPABASE_URL = "https://psutbulpezfdftmaqkoo.supabase.co"
$env:SUPABASE_SERVICE_KEY = "<secret serveur>"
node scripts/sync_catalogue.mjs --write --trigger=local
```

Ne jamais placer la clé serveur dans `pwa/`, un fichier versionné, une capture ou un journal.

## Volume et rétention

- Métadonnées : synchronisation toutes les 5 minutes.
- Catalogue : 100 événements Polymarket et 150 marchés Manifold actifs.
- Snapshots : au maximum 300 issues parmi les 100 marchés les plus actifs.
- Pas temporel : 15 minutes, idempotent par `(outcome_id, recorded_at)`.
- Une politique de purge des snapshots anciens sera ajoutée avant l'activation longue durée.

## Garanties

- Upserts idempotents par `(source, external_id)` et `(market_id, external_id)`.
- Une source en panne n'efface pas les données de l'autre.
- Les marchés absents d'une synchronisation réussie sont marqués `unavailable_at`, jamais supprimés.
- Lecture du catalogue autorisée à la PWA ; mutations réservées à `service_role`.
- Aucun accès à `eclats_ledger`.
