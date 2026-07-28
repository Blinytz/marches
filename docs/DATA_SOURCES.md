# DATA_SOURCES.md · Marchés

## Polymarket (statut Phase 0 : SUPPORTED, voir POLYMARKET_CONNECTIVITY_REPORT.md)

| Usage | Base |
| --- | --- |
| Événements, marchés, tags, recherche | `https://gamma-api.polymarket.com` |
| Prix, midpoint, carnet, historique | `https://clob.polymarket.com` |
| Trades publics, activité | `https://data-api.polymarket.com` |
| Temps réel | `wss://ws-subscriptions-clob.polymarket.com/ws/market` |

Points observés au spike (21/07/2026) :

- `GET /events?limit=&active=true&closed=false&order=volume24hr` : événements avec `markets[]`
  imbriqués ; champs utiles : `id, ticker, slug, title, description, resolutionSource, startDate,
  endDate, image, icon, active, closed, tags`.
- Marché : `question, conditionId, outcomes` (JSON string), `outcomePrices` (JSON string),
  `clobTokenIds` (JSON string), `liquidity, volume, endDate, resolutionSource`.
- CLOB `book` : `bids[], asks[], tick_size, min_order_size, neg_risk, last_trade_price, hash`.
- WS market : abonnement `{"assets_ids": [...], "type": "market"}` ; snapshot `book` immédiat ;
  événements attendus : `book, price_change, last_trade_price, best_bid_ask, new_market,
  market_resolved` (custom events à activer selon doc).
- Aucune clé requise ; respecter les rate limits documentées
  (`docs.polymarket.com/api-reference/rate-limits`).

## Manifold

| Usage | Base |
| --- | --- |
| REST | `https://api.manifold.markets/v0` |
| Temps réel | `wss://api.manifold.markets/ws` |

- `GET /markets?limit=` (500 max), `GET /market/{id}`, `GET /search-markets?term=`.
- WS : `{"type": "subscribe", "txid": n, "topics": ["global/new-contract",
  "global/updated-contract", "contract/{id}"]}` ; ack `{"type":"ack"}` ; ping toutes les 30-60 s.
- Limite : 500 requêtes/min/IP. Usage personnel non commercial autorisé.
- Champs clés : voir section 13.3 du hand-off (`probability, outcomeType, mechanism, isResolved,
  resolution, resolutionProbability, closeTime, answers[]` pour MULTIPLE_CHOICE avec
  `shouldAnswersSumToOne`).

## Normalisation

### Branchement navigateur du 28/07/2026

- `pwa/js/api/normalize.js` contient les normaliseurs purs et testés des deux sources.
- `pwa/js/api/market-data.js` charge 100 événements Polymarket classés par volume sur 24 h et
  jusqu'à 500 marchés Manifold, dont les 150 ouverts les plus actifs sont conservés.
- Le dernier catalogue réel est mis en cache local pendant les indisponibilités réseau.
- Les sources sont indépendantes : l'échec de l'une n'empêche pas l'affichage de l'autre.
- Le catalogue réel ne contient pas de données financières Éclats. Le portefeuille et le
  registre sont lus séparément dans le projet Supabase commun à l'écosystème.
- `pwa/js/api/market-detail.js` enrichit à la demande une fiche Polymarket avec `/book`,
  `/midpoint` et `/prices-history`, ou une fiche Manifold avec `/market/{id}`.
- Un seul WebSocket est maintenu : celui de la fiche actuellement ouverte. Il est fermé au
  changement de page et se reconnecte après une coupure, sans jamais envoyer d'ordre.

Modèle commun `NormalizedMarket` (section 14 du hand-off), conservé tel quel avec `rawPayload`
JSONB. Clé d'unicité : `(source, external_id)`. Aucune déduplication inter-sources.

Négociable v1.5 : Polymarket binaire actif avec carnet ; Manifold `BINARY` et `MULTIPLE_CHOICE`.
Consultable seul : `FREE_RESPONSE, NUMERIC, PSEUDO_NUMERIC, BOUNTIED_QUESTION, POLL`, marchés à
données douteuses (raison affichée).

## Cadence (défauts du registre)

- Métadonnées : 300 s (GitHub Actions).
- Positions ouvertes et favoris : 60 s si l'infrastructure gratuite le permet, sinon fréquence
  minimale disponible documentée.
- Snapshots de prix : 300 s.
- Réconciliation complète : quotidienne.
- Navigateur ouvert : WebSockets directs, resync REST à la reconnexion.
