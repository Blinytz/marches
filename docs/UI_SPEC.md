# UI_SPEC.md · Marchés

Règles normatives : sections 8 à 11 du hand-off. Wireframes : UI_REFERENCE_AND_WIREFRAMES.md.

## Direction

Interface premium sombre par défaut, dense mais respirante, originale (ni clone Polymarket, ni
prototype générique). Thème clair cohérent. Contraste WCAG AA. Aucun tiret long visible (D-005).

## Tokens (thème sombre, section 10.3 du hand-off)

Appliqués dans `pwa/css/style.css` via custom properties : fond `#090D14`, surfaces `#0F1622 /
#151E2C / #1C2737`, bordure `#263346`, textes `#F3F6FA / #A9B5C6 / #718096`, accent `#8B7CFF`
(hover `#A195FF`), OUI `#20C997` (fond `#123D36`), NON `#FF6B6B` (fond `#48252A`), avertissement
`#F5B942`, info `#4DA3FF`, succès `#39D98A`.

- Typo : Inter si disponible, sinon pile système ; chiffres `tabular-nums` partout où un nombre
  peut changer ; corps 14-16 px, métadonnées 12-13 px.
- Grille 4 px ; espacements 8/12/16/24/32/48 ; rayon cartes 12 px, boutons 8-10 px ; bordures
  plutôt qu'ombres en sombre.
- Mouvement : flash prix 300-500 ms, bottom sheet 180-240 ms, skeletons plutôt que spinners,
  `prefers-reduced-motion` respecté, aucun son.

## Navigation

- Desktop : barre fixe 64 px (logo, recherche `/` ou `Ctrl+K`, solde + à récupérer, temps réel,
  notifications, profil) + barre de sections :
  `Pour moi | 24 h | France & Europe | Nouveaux | Populaires | Thèmes | En jeu | Ma liste`.
- Mobile : navigation basse `Marchés | Recherche | Portefeuille | Résultats` + accès En jeu via
  Marchés et compteur de positions ; badge persistant si gain non récupéré.
- Contenu max 1440 px. Fiche desktop : 2 colonnes, ticket fixe 360-400 px.

## Composants clés

- **Carte marché** : image/icône, titre, badge source (POLY/MANI, jamais ambigus), thème, proba +
  variation 24 h, volume, échéance (distinguer clôture et résolution attendue), état tradable,
  boutons rapides OUI/NON si binaire, étoile favori, menu suivre/masquer.
- **Ticket** : achat/vente/confirmation/succès/erreur ; montant + raccourcis 50/100/250/500/Max ;
  parts estimées, prix moyen, spread, frais, paiement et bénéfice potentiels ; bouton explicite
  (« Acheter OUI pour 250 Éclats ») ; confirmation au prix serveur.
- **Carte position (En jeu)** : compacte + détail inline ; entrée vs actuel, P&L latent, paiement
  potentiel, échéance avec compte à rebours, sparkline depuis l'achat, actions Voir/Renforcer/
  Vendre. Formulations exactes (« le marché vous est actuellement favorable », jamais « gagné à
  72 % »).
- **Claim** : encart « X Éclats vous attendent », bouton « Récupérer X Éclats », états
  Récupération…/Gain récupéré · +X Éclats ; animation de transfert vers le compteur de solde
  seulement après confirmation serveur.
- **Fraîcheur** : « En direct », « Actualisé il y a Xs », « Données retardées » sur toute donnée
  de prix.

## États obligatoires

Les 27 états de la section 11 du hand-off sont tous représentés dans le prototype via les
fixtures (voir tests/fixtures/README.md) : skeletons, vides, sources en panne, WS déconnecté,
marchés fermés/résolus/annulés/non négociables, profondeur insuffisante, prix modifié, solde
insuffisant, double clic, claims dans tous leurs états, image cassée, erreur inconnue avec
identifiant de support.
