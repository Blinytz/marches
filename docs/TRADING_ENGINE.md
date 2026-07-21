# TRADING_ENGINE.md · Éclats Marchés

Règles normatives : sections 5, 6, 7 du hand-off. Ici : leur traduction dans l'architecture retenue
(PWA + Supabase, D-001/D-002/D-003).

## Chemin d'un achat

1. Le client construit l'ordre (marché, issue, montant en Éclats, clé d'idempotence générée).
2. Edge Function `previsualiser_ordre` : relit le statut et le prix exécutable à la source
   (best ask Polymarket avec profondeur ; probabilité Manifold + spread miroir), calcule parts,
   frais, paiement max ; retourne une prévisualisation datée.
3. Edge Function `executer_ordre` : revérifie prix et statut ; si écart > tolérance
   (`PRICE_TOLERANCE_POINTS` 0,02 ou `PRICE_TOLERANCE_RELATIVE` 5 %, le plus strict), renvoie une
   demande de reconfirmation ; sinon appelle la fonction SQL transactionnelle.
4. Fonction SQL (SECURITY DEFINER) : advisory lock utilisateur, contrôles (solde, min/max,
   exposition max), débit `eclats_ledger` (source `marches_mise`, idempotency_key), création
   `orders` + `trades` + `position_lots` + mise à jour `positions`, reçu en retour.

Vente : symétrique, consommation FIFO des lots, crédit immédiat `marches_vente`, P&L réalisé
calculé lot par lot avec la valeur nominale historique de chaque lot.

## Prix

- Polymarket : affichage midpoint/dernier prix (nommé) ; exécution best ask/bid avec consommation
  virtuelle de la profondeur ; exécution partielle si `ALLOW_PARTIAL_FILLS` ; jamais d'ordre envoyé.
- Manifold : prix miroir = probabilité publique ± `MANIFOLD_LOCAL_SPREAD` (défaut 0,01), borné à
  [0,01, 0,99] ; libellé « Prix miroir Manifold » ; aucun impact AMM simulé.
- `prix_unitaire = p × WINNING_SHARE_PAYOUT` (défaut 100 Éclats). La valeur nominale est
  enregistrée sur chaque lot ; un changement de réglage ne touche que les nouveaux lots.

## Résolution et claims

- Oracle unique : la source. Détection : WebSocket + polling REST + réconciliation quotidienne.
- Idempotence règlement : `settlement:{source}:{external_market_id}:{source_resolution_timestamp}`.
- Le règlement crée settlement + clôture de position + P&L réalisé + `payout_claim`
  (`CLAIMABLE`/`REFUND_CLAIMABLE`) + notification. **Aucun crédit automatique.**
- Récupération : fonction SQL atomique `recuperer_claim` (lock ligne, vérif état, crédit unique
  `marches_gain` avec idempotency_key `claim:{user_id}:{settlement_id}`, passage `CLAIMED`,
  retour soldes avant/après). Un seul crédit possible quel que soit le nombre de clics/appareils.
- Annulation : remboursement = coût d'acquisition restant des lots détenus, via claim.
- Manifold `MKT`/partiel : proportionnel si `resolutionProbability`, sinon `REVIEW_REQUIRED`.
- `RESOLUTION_CHANGED` après récupération : jamais de débit automatique, alerte + décision manuelle.

## États

```text
UNRESOLVED → RESOLVED_WON → CLAIMABLE → CLAIMING → CLAIMED
UNRESOLVED → RESOLVED_LOST
UNRESOLVED → CANCELLED → REFUND_CLAIMABLE → CLAIMING → CLAIMED
```

## Tests critiques (Phase C/D)

Voir section 22 du hand-off. Les tests unitaires financiers s'exécutent contre les fonctions SQL
(pgTAP ou scripts Node + base locale) : FIFO, arrondis, double soumission, double résolution,
double clic Récupérer, changement de valeur nominale avec lots existants.
