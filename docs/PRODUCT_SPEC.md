# PRODUCT_SPEC.md · Marchés

**Source de vérité produit : `HANDOFF_CLAUDE_CODE_ECLATS_MARKETS_V1_5.md`** (copie dans ce dossier).
Ce fichier ne duplique pas le hand-off ; il fixe la lecture qui en est faite et renvoie aux
documents spécialisés.

## Résumé

Application personnelle mono-utilisateur de marchés de prédiction miroirs : les questions, prix et
résolutions viennent de Polymarket et Manifold (lecture seule), les positions sont virtuelles et
payées en Éclats, monnaie commune de l'écosystème (portefeuille central `eclats_ledger`).

- Une part gagnante paie `WINNING_SHARE_PAYOUT` (défaut 100 Éclats), une perdante paie 0.
- Prix théorique d'une part = probabilité × valeur nominale.
- Aucune transaction réelle sur les plateformes sources, aucun wallet crypto, aucun argent réel.
- La résolution crée un gain récupérable ; seul le clic « Récupérer » crédite le portefeuille.
- Tout marché public des deux sources est consultable ; les doublons inter-sources sont conservés.
- Interface en français ; le contenu des marchés peut rester en anglais (v1.5).

## Documents

| Sujet | Document |
| --- | --- |
| Règles de trading, FIFO, résolutions, claims | TRADING_ENGINE.md |
| Sources externes, endpoints, normalisation | DATA_SOURCES.md |
| Schéma de base | DATABASE.md |
| Écrans, wireframes, système visuel | UI_SPEC.md, UI_REFERENCE_AND_WIREFRAMES.md |
| Décisions et hypothèses | DECISIONS.md |
| Avancement | PLAN.md |
| Connectivité Polymarket | POLYMARKET_CONNECTIVITY_REPORT.md |

## Garde-fous absolus (rappel section 0)

1. Jamais de modification du solde d'Éclats depuis le navigateur.
2. Jamais d'exécution à un prix issu du cache d'affichage : relecture serveur systématique.
3. Clôture ≠ résolution ; la source externe est le seul oracle.
4. Jamais de fusion Polymarket/Manifold.
5. Interface validée sur fixtures avant tout branchement financier.
6. Aucun contournement géographique, aucun VPN.
7. Aucune règle financière inventée ; en cas de doute, transaction désactivée + journalisation.
