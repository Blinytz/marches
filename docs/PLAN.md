# Plan de réalisation · Éclats Marchés v1.5

Décliné du plan imposé (section 26 du hand-off), adapté à la stack décidée (D-001, D-002).
Statuts : [x] fait · [~] en cours · [ ] à faire.

## Phase 0 · Audit et spikes sans mutation

- [x] Lecture intégrale du hand-off
- [x] Inspection de l'écosystème existant (paris-sportifs, eclats-meteo) : conventions PWA,
      `eclats_ledger`, modèle RPC SECURITY DEFINER, GitHub Actions cron
- [x] Spike Manifold : REST liste/détail/recherche + WebSocket (ack reçu)
- [x] Spike Polymarket depuis la France : Gamma, CLOB (midpoint, price, book, history), Data API,
      WebSocket market channel (snapshot book reçu) · conclusion `SUPPORTED`
- [x] `docs/POLYMARKET_CONNECTIVITY_REPORT.md`
- [x] Écarts et contradictions consignés (DECISIONS.md, section Contradictions du README)
- [ ] Rejouer le spike depuis GitHub Actions et Supabase Edge Functions (préalable Phase B)

**Gate 0 : franchie** (usage lecture seule accessible sans contournement).

## Phase A · Fondations visuelles

- [x] Design tokens (10.3) et composants de base
- [x] Fixtures fictives couvrant tous les scénarios exigés + `tests/fixtures/README.md`
- [x] Wireframes basse fidélité (`UI_REFERENCE_AND_WIREFRAMES.md`)
- [x] Shell desktop/mobile, navigation, recherche
- [x] Accueil, recherche, fiche binaire, fiche multi-choix, ticket, En jeu, portefeuille,
      résultats (avec bouton Récupérer et animation), favoris, paramètres, notifications
- [x] États d'erreur et de chargement (section 11, pilotés par la barre Démo)
- [x] Captures aux largeurs 375, 768, 1280, 1440 (`docs/captures/`)
- [ ] **Validation visuelle par l'utilisateur (Gate A : bloquant pour la suite)**
- [ ] Retouches issues de la validation

## Phase B · Lecture réelle

- [ ] Spike de connectivité depuis GitHub Actions et Edge Functions
- [ ] Schéma Supabase référentiel externe (DATABASE.md) + migrations
- [ ] Adaptateur Polymarket (Gamma + CLOB + Data) et normalisation
- [ ] Adaptateur Manifold (REST) et normalisation
- [ ] Sync GitHub Actions : import 5 min, pagination initiale, payloads bruts JSONB
- [ ] Taxonomie française canonique + table de correspondance des tags
- [ ] Recherche, filtres, tris, favoris, fil « Pour moi » déterministe
- [ ] WebSockets navigateur + indicateurs de fraîcheur + snapshots de prix
- [ ] Graphiques réels

**Gate B :** tout fonctionne en lecture seule, doublons visibles, sources distinguées.

## Phase C · Trading simulé

- [ ] Registre de réglages `system_settings` + page Paramètres branchée
- [ ] Migration `eclats_ledger` : colonne `idempotency_key` (D-003)
- [ ] Fonctions SQL : achat (avec relecture prix via Edge Function), vente FIFO, lots
- [ ] Prévisualisation serveur + tolérance de variation de prix
- [ ] Portefeuille et En jeu sur données réelles
- [ ] Tests de concurrence et double soumission

**Gate C :** aucun écart comptable sous double soumission.

## Phase D · Résolutions

- [ ] Détection WebSocket + polling de rattrapage + réconciliation quotidienne
- [ ] Règlements gagné/perdu/annulé/partiel, claims sans crédit automatique
- [ ] Bouton Récupérer : crédit atomique unique, états CLAIMABLE→CLAIMED
- [ ] Notifications (matrice section 18)
- [ ] Page admin anomalies

**Gate D :** double résolution sans double claim, double clic sans double crédit.

## Phase E · Connexion à l'écosystème

- [ ] Branchement du vrai `eclats_ledger` (purge explicite des données de test)
- [ ] Tests bout en bout petit montant
- [ ] Déploiement GitHub Pages privé + crons
