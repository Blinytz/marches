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
- Rétention appliquée à chaque synchronisation : **7 jours de catalogue** après
  la disparition d'un marché, 90 jours de relevés de prix, 30 jours
  d'exécutions dans `mk_sync_runs`. Une purge en échec est journalisée et
  rejouée au créneau suivant, elle ne fait pas échouer la synchronisation.
- La purge du catalogue passe par `public.mk_purger_catalogue(jours)`, réservée
  à `service_role`. Elle épargne tout marché portant une position ou une
  transaction, et se borne à 10 000 marchés par appel.
- Plus aucun payload brut n'est stocké. Voir ci-dessous.

## L'épisode du quota, 12 août 2026

Supabase a signalé 1 327 Mo occupés pour une limite gratuite de 500 Mo, puis a
basculé le projet en lecture seule. Mesuré dans la base : `mk_events` 613 Mo
dont 555 Mo de payloads, `mk_markets` 606 Mo dont 547 Mo, `mk_outcomes` 175 Mo.
Ces réponses brutes n'alimentaient que trois dates de création.

Seconde cause, découverte en vérifiant la première : 5 334 nouveaux marchés
entrent par jour, 36 896 étaient stockés, dont 1 339 encore vivants. La PWA ne
lit que les vivants. Sans rétention, la base regagnait 28 Mo par jour et serait
repassée au-dessus de la limite en une dizaine de jours, payloads ou pas.

Le projet a été basculé en **lecture seule** par Supabase : la base refuse
toute écriture tant que la place n'est pas rendue. Le script lève ce verrou
pour sa propre session, ce qui impose de le lancer d'un seul bloc.

Correctif, dans cet ordre :

1. mettre le workflow de synchronisation en pause, sinon les payloads
   reviennent au créneau de cinq minutes suivant ;
2. exécuter `sql/004_alleger_catalogue.sql` en une seule exécution, puis
   `vacuum` seul dans un onglet vide ;
3. déployer la PWA et le collecteur, jamais avant l'étape 2 : le client lit
   `created_source_at`, et sans la colonne PostgREST répond 400 ;
4. réactiver le workflow.

La colonne `raw_payload` est conservée, vide, pour ne casser aucune écriture.
Les marchés antérieurs à la migration qui n'étaient plus synchronisés perdent
leur date de création à la source : la PWA se replie sur `first_seen_at`.

## Garanties

- Upserts idempotents par `(source, external_id)` et `(market_id, external_id)`.
- Une source en panne n'efface pas les données de l'autre.
- Les marchés absents d'une synchronisation réussie sont marqués `unavailable_at`, jamais supprimés.
- Lecture du catalogue autorisée à la PWA ; mutations réservées à `service_role`.
- Aucun accès à `eclats_ledger`.
