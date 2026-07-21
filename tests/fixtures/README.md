# Fixtures Phase A · cartographie des scénarios

Source unique des fixtures : `pwa/js/data/fixtures.js` (module ES importé par le prototype).
Chaque scénario exigé par la section 26 (Phase A) du hand-off correspond à au moins une fixture
et à un état d'interface vérifiable dans le prototype.

| # | Scénario exigé | Fixture | État UI à valider |
| - | --- | --- | --- |
| 1 | Événement Polymarket binaire | `pm-fed-juillet` | Fiche binaire complète, carnet, graphique, ticket |
| 2 | Événement Polymarket multi sous-marchés | `pm-presidentielle-2027` | Liste d'issues avec boutons OUI/NON par candidat |
| 3 | Marché Manifold binaire | `mf-psg-ligue1` | Fiche avec créateur, prix miroir, règles du créateur |
| 4 | Manifold choix multiples somme 100 % | `mf-studio-film-2026` | Liste de réponses, spread +1 sur la réponse choisie |
| 5 | Manifold réponses indépendantes | `mf-ia-jalons-2026` | Mention explicite « ne totalisent pas 100 % », achat par réponse |
| 6 | Format Manifold atypique lecture seule | `mf-poll-vacances` (POLL) | Badge « Consultable · trading non pris en charge » |
| 7 | Marché court < 24 h | `pm-shutdown-31` (14 h), `mf-greve-sncf` (5 h) | Section 24 h, compte à rebours |
| 8 | Marché long terme | `pm-mars-2030` | Section long terme, malus de fil, pas d'exclusion |
| 9 | Doublon apparent entre sources | `pm-fed-juillet` + `mf-fed-juillet` | Deux résultats distincts en recherche, jamais fusionnés |
| 10 | Marché sans image | `mf-titre-long` (imageUrl null) | Fallback d'icône thématique |
| 11 | Titre et règles très longs en anglais | `mf-titre-long` | Troncature propre, fiche lisible |
| 12 | Sans prix / sans liquidité / retardé | `mf-prix-absent`, `pm-carnet-vide`, `pm-petrole-90` | Raisons exactes affichées, actions suspendues, badge retardé |
| 13 | Position favorable et défavorable | `pos-fed` (OUI +8,4 pts), `pos-psg` (NON -6 pts) | Cartes En jeu, formulations exactes |
| 14 | Vente partielle | `pos-shutdown` (2,84 parts vendues) | Exposition nette réduite, chronologie de vente |
| 15 | Marché fermé en attente | `mf-canicule-juillet` + `pos-canicule` | « Fermé · résolution en attente », trading masqué |
| 16 | Victoire avec claim non récupéré | `claim-shutdown` (1 240 Éclats, CLAIMABLE) | Bandeau, bouton « Récupérer 1 240 Éclats » |
| 17 | Récupération en cours | `claim-encours` (CLAIMING) | Bouton désactivé « Récupération… » |
| 18 | Gain déjà récupéré | `claim-fait` (CLAIMED) | Bouton gris permanent « Gain récupéré · +412 Éclats » |
| 19 | Défaite | `def-eurusd` (-300) | Liste sobre des perdus, P&L réalisé |
| 20 | Annulation avec remboursement | `claim-metro` (REFUND_CLAIMABLE, 180) | Bouton « Récupérer le remboursement », raison affichée |
| 21 | Panne de source, WS déconnecté | barre démo du prototype (`?demo`) | Bandeaux source indisponible / reconnexion, données conservées |

La barre démo (repliable, visible uniquement dans le prototype) permet de basculer : panne
Polymarket, panne Manifold, WebSocket déconnecté/reconnexion, skeletons de chargement, solde
insuffisant dans le ticket, prix modifié avant confirmation, profondeur insuffisante, erreur
inconnue avec identifiant de support. Ces bascules couvrent les états de la section 11 qui ne
découlent pas naturellement des données.

Interdictions vérifiées sur ces fixtures : aucun tiret long dans les textes, aucune fusion
inter-sources, montants en Éclats uniquement.
