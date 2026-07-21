# Rapport de connectivité Polymarket · Phase 0

- Date du test : 21/07/2026, 18h41 (Europe/Paris)
- Région testée : France, réseau résidentiel de l'utilisateur (machine locale)
- Méthode : requêtes directes Node.js 24 (fetch et WebSocket natifs), lecture seule
- Aucun VPN, proxy de contournement ou falsification de localisation
- Script : spike reproductible (voir `scripts/spike_connectivity.mjs`)

## Contexte

Le site de trading polymarket.com n'est pas accessible depuis la France. Les APIs publiques de
données (Gamma, CLOB, Data, WebSocket) sont en revanche documentées comme ouvertes, sans clé ni
authentification. Ce test vérifie leur accessibilité réelle depuis la France, sans contournement :
si l'API répond à une requête directe, l'usage en lecture seule est considéré comme accessible.

## Résultats

| # | Capacité (section 12.0) | Endpoint | Résultat | Latence |
| - | --- | --- | --- | --- |
| 1 | Gamma : liste d'événements | `gamma-api.polymarket.com/events` | 200 OK, 3 événements complets | 126 ms |
| 2a | Gamma : détail événement | `gamma-api.polymarket.com/events/{id}` | 200 OK | 21 ms |
| 2b | Gamma : détail marché | `gamma-api.polymarket.com/markets/{id}` | 200 OK (outcomes, outcomePrices, conditionId) | 21 ms |
| 3a | CLOB : midpoint | `clob.polymarket.com/midpoint` | 200 OK | 71 ms |
| 3b | CLOB : prix côté achat | `clob.polymarket.com/price?side=buy` | 200 OK | 53 ms |
| 4 | CLOB : carnet d'ordres | `clob.polymarket.com/book` | 200 OK (bids, asks, tick_size, last_trade_price) | 34 ms |
| 5 | CLOB : historique de prix | `clob.polymarket.com/prices-history` | 200 OK (série history) | 60 ms |
| 6 | WebSocket Market Channel | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Connexion ouverte en 93 ms | 93 ms |
| 7 | Réception d'un message de prix | abonnement `{assets_ids, type: "market"}` | Snapshot `book` complet reçu en 129 ms | 129 ms |
| 8 | Message de résolution | non observable à la demande | À traiter en Phase D : simulation propre + rattrapage REST (statut Gamma `closed`/`umaResolutionStatus`) | n/a |
| 9 | Codes HTTP et restrictions | tous les appels | Aucun 403, aucun blocage géographique observé, aucune demande de clé | 21-378 ms |
| 10 | Conformité d'usage | documentation officielle | Endpoints de market data documentés publics et sans authentification ; usage prévu : lecture seule, personnel, non commercial, aucun ordre réel envoyé | n/a |

Données annexes : `data-api.polymarket.com/trades` répond aussi 200 OK (85 ms).

Manifold (testé dans le même spike) : `GET /v0/markets`, `GET /v0/market/{id}`,
`GET /v0/search-markets` et `wss://api.manifold.markets/ws` (ack d'abonnement reçu en 239 ms)
fonctionnent tous.

## Conclusion : `SUPPORTED`

Toutes les capacités requises (métadonnées, prix, carnet, historique, temps réel) sont accessibles
depuis la France en lecture seule, sans aucun contournement. L'intégration Polymarket peut être
développée normalement.

## Réserves et suites obligatoires

1. **Environnements d'exécution restants à tester en Phase B** : le test couvre le navigateur de
   l'utilisateur (là où vivront les WebSockets de la PWA). Les tâches planifiées et les fonctions
   serveur s'exécuteront ailleurs (GitHub Actions, Supabase Edge Functions) : refaire le spike
   depuis ces environnements avant d'activer la synchronisation et consigner le résultat ici.
2. **Réversibilité** : l'application doit rester fonctionnelle en mode Manifold seul si Polymarket
   venait à restreindre ses APIs de données (exigence 12.0 du hand-off). Prévu via un réglage
   d'activation par source.
3. **Aucun secret** dans ce rapport ni dans le script de spike.
4. Le message `market_resolved` du WebSocket n'a pas pu être observé en direct (aucune résolution
   pendant la fenêtre de test) : la Phase D doit s'appuyer sur le trio WebSocket + polling REST +
   réconciliation quotidienne, comme exigé par la section 7.2.
