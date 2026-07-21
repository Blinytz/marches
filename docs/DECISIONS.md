# DECISIONS.md · Éclats Marchés

Journal des hypothèses et décisions prises pendant l'implémentation, comme exigé par la
section 0 du hand-off. La référence produit reste `HANDOFF_CLAUDE_CODE_ECLATS_MARKETS_V1_5.md`.

## D-001 · Stack : PWA vanilla JS + Supabase au lieu de Next.js (21/07/2026)

La section 23 du hand-off recommande Next.js/TypeScript/Tailwind mais autorise un changement
justifié ici. Décision : suivre les conventions de l'écosystème Éclats existant
(paris-sportifs, eclats-meteo) : **PWA statique vanilla JS (modules ES), hash router, CSS
custom properties, Supabase JS**.

Justification :

1. Le hand-off exige lui-même la cohérence avec « les composants et conventions visuelles déjà
   présents dans l'écosystème » (10.2.1) et le branchement sur l'écosystème Supabase en place (4.2).
2. Hébergement gratuit identique aux autres apps : GitHub Pages (statique), zéro build, zéro
   serveur applicatif à payer ou maintenir.
3. Les exigences « côté serveur » (prix revérifié, mutations atomiques, idempotence) sont
   satisfaites par Supabase : fonctions SQL SECURITY DEFINER pour les transactions (modèle
   `place_bet` des paris sportifs) et Edge Functions pour les lectures de prix externes au moment
   de la confirmation.
4. Mono-utilisateur, coût minimal : un framework SSR n'apporte rien d'indispensable ici.

Réversible : le prototype Phase A est du HTML/CSS/JS portable ; le moteur de trading vit en SQL et
Edge Functions, indépendants du frontend.

Conséquences : TypeScript strict, Tailwind, Radix, TanStack Query, Vitest et Playwright ne sont
pas utilisés tels quels. Les tests unitaires du moteur porteront sur les fonctions SQL et les
modules JS purs (voir TRADING_ENGINE.md, Phase C). Lightweight Charts reste envisageable en
vendored (comme Leaflet dans eclats-meteo) ; sinon canvas/SVG maison.

## D-002 · Hébergement et environnements (21/07/2026)

- Frontend : GitHub Pages (comme les autres apps de l'écosystème).
- Temps réel interface ouverte : WebSockets directs depuis le navigateur (vérifié Phase 0 depuis la France).
- Tâches planifiées (sync métadonnées, polling résolutions, réconciliation) : GitHub Actions cron
  (modèle paris-sportifs) avec le rôle service Supabase.
- Confirmation d'ordre : Supabase Edge Function (relit le prix externe, appelle la fonction SQL).
- Le spike de connectivité devra être rejoué depuis GitHub Actions et Supabase Edge Functions en
  Phase B (voir POLYMARKET_CONNECTIVITY_REPORT.md).

## D-003 · Portefeuille central : adaptateur au-dessus de `eclats_ledger` (21/07/2026)

Le portefeuille commun existe déjà : table `eclats_ledger` du projet Supabase `eclats`
(`user_id`, `amount` signé, `source`, `reference_id`, `created_at`), solde = somme des lignes,
écritures uniquement via fonctions SECURITY DEFINER, RLS lecture seule pour le client.

- `EclatsWalletProvider` sera implémenté au-dessus de ce schéma, sans second solde ni table
  concurrente (exigence 4.2).
- Sources de mouvement prévues : `marches_mise`, `marches_vente`, `marches_gain`,
  `marches_remboursement`.
- Écart avec l'interface idéale du hand-off : `eclats_ledger` n'a ni clé d'idempotence ni
  notion de réservation. Décisions associées :
  - **Idempotence** : ajouter en Phase C une colonne nullable `idempotency_key text unique`
    à `eclats_ledger` (migration non cassante pour les autres apps).
  - **reserve/release** : non implémentés dans le ledger central ; un achat débite
    immédiatement (comme `place_bet` des paris sportifs). Le concept de réservation reste dans
    l'adaptateur au cas où (reserve = debit + release = credit compensatoire).
- Phase A : provider fictif en mémoire, aucune connexion au vrai ledger.

## D-004 · Précision monétaire (21/07/2026)

`numeric` Postgres côté base (précision 24,8 pour parts et prix unitaires), calculs financiers
exclusivement dans les fonctions SQL (jamais en flottant JS). Le frontend n'affiche que des
valeurs formatées (2 décimales d'Éclats max). Pas de bibliothèque Decimal JS nécessaire tant
qu'aucun calcul financier n'est fait côté client ; les estimations affichées avant confirmation
sont marquées indicatives et recalculées par le serveur.

## D-005 · Typographie des textes visibles (21/07/2026)

Règle d'écosystème : aucun tiret long (cadratin « — », demi-cadratin « – », moins « − ») dans le
contenu visible. Remplacements : « ? » ou mot pour valeur manquante, « · » ou « : » comme
séparateur, trait d'union simple « - » pour scores et intervalles. Vérification par grep avant
chaque livraison. Les textes originaux anglais importés des sources sont affichés tels quels
(contenu externe, pas rédigé par l'app).

## D-006 · Périmètre Phase A (21/07/2026)

Prototype navigable 100 % sur fixtures locales : aucune connexion API persistante, aucune écriture
financière, monnaie fictive en mémoire (solde de démonstration). Les wireframes basse fidélité
sont consignés dans `UI_REFERENCE_AND_WIREFRAMES.md` puis traduits en prototype haute fidélité
dans `pwa/`.

## D-007 · Nom des routes internes (21/07/2026)

Navigation par hash : `#/accueil`, `#/recherche`, `#/marche/{source}/{id}`, `#/enjeu`,
`#/portefeuille`, `#/resultats`, `#/favoris`, `#/parametres`, `#/notifications`. Libellés UI en
français, identifiants techniques en français sans accents (convention des autres apps).
