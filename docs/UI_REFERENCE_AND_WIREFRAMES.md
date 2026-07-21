# UI_REFERENCE_AND_WIREFRAMES.md · Éclats Marchés

Wireframes basse fidélité originaux (livrable Phase A). Conçus sans capture Polymarket, à partir
du hand-off, des APIs réelles observées en Phase 0, de l'interface publique Manifold et des
conventions de l'écosystème Éclats. Le prototype haute fidélité navigable (`pwa/`) en est la
traduction directe ; les captures du prototype servent de référence visuelle finale.

Légende : `[..]` bouton · `(..)` badge/pastille · `★` favori · `▲▼` variation · les nombres sont
des exemples.

## 1. Shell desktop (≥1024 px)

```text
+------------------------------------------------------------------------------+
| ✦ Éclats Marchés   [Recherche............ /]   ⚡En direct  🔔3   ◇ 12 450   |
|                                                          + 1 240 à récupérer |
+------------------------------------------------------------------------------+
| Pour moi | 24 h | France & Europe | Nouveaux | Populaires | Thèmes | En jeu● |
+------------------------------------------------------------------------------+
|  contenu max 1440 px                                                         |
```

Solde d'en-tête = portefeuille central uniquement ; « + X à récupérer » séparé, cliquable vers
Résultats. Pastille sur « En jeu » = nombre de positions ouvertes.

## 2. Shell mobile (≤767 px)

```text
+------------------------------+
| ✦ Marchés        ◇12 450  🔔 |
+------------------------------+
|  (contenu, cartes pleine     |
|   largeur, rangées horiz.)   |
+------------------------------+
| Marchés Recherche Portef. Résultats● |
+------------------------------+
```

## 3. Accueil « Pour moi » (mélange de formats, pas un mur de cartes)

```text
[ Bandeau claim s'il existe : « 1 240 Éclats vous attendent  [Récupérer] » ]

■ Se résout dans les 24 h                        (rangée compacte, scroll horiz.)
  +--------------+ +--------------+ +--------------+
  | (POLY) ★     | | (MANI) ★     | | (POLY)       |
  | Fed cut in   | | PSG remporte | | Shutdown US  |
  | July?        | | la Ligue 1?  | | avant le 31? |
  | 37% ▲2.1     | | 82% ▼0.4     | | 12% ▲0.8     |
  | ⏱ 6 h  vol 2M| | ⏱ 22 h       | | ⏱ 14 h       |
  | [OUI] [NON]  | | [OUI] [NON]  | | [OUI] [NON]  |
  +--------------+ +--------------+ +--------------+

■ Nouveaux dans vos thèmes (IA, France, Espace)
  carte éditoriale large : image + titre + 3 sous-marchés inline

■ France & Europe          ■ Mouvements sur vos positions
  liste compacte :           ligne : titre · 64% ▲8.4 depuis achat · P&L +214
  titre.......... 22% ▲1
  titre.......... 57% ▼3

■ Long terme à surveiller (volontairement court, 3 items)
```

## 4. Liste multi-issues (événement Polymarket multi-candidats)

```text
+------------------------------------------------------------------+
| (POLY) Qui remportera la présidentielle 2027 ?        vol 41M  ★ |
|  img  Candidat A        31%  [OUI 31] [NON 69]                   |
|  img  Candidat B        24%  [OUI 24] [NON 76]                   |
|  img  Candidat C        12%  [OUI 12] [NON 88]                   |
|  + 9 autres issues…                                              |
+------------------------------------------------------------------+
```

## 5. Recherche

```text
[ france grève............ ✕ ]   34 résultats   [Enregistrer ce filtre]
(chips: Source: Toutes ▾)(Thème ▾)(Horizon: <24h ✕)(Tradable ✓)(+ Filtres)
  liste de résultats avec badge source visible ; doublons POLY/MANI côte à côte,
  jamais fusionnés ; formats non négociables affichés avec
  (Consultable · trading non pris en charge)
```

## 6. Fiche marché binaire desktop (2 colonnes)

```text
Accueil > Économie > (POLY)                          | +--------------------+
img  La Fed baisse ses taux en juillet ?         ★ ⤴ | | Ticket             |
37% OUI  ▲2.1 (24 h)   (Ouvert)  ⏱ clôture 31/07     | | [OUI 37] [NON 63]  |
[========= graphique 1h 6h 1j 1s 1m tout =========]  | | Montant [  250  ]  |
| survol: date · prix · volume                       | | (50)(100)(250)(500)|
Issues : OUI 37 · NON 63                             | | (Max)              |
Stats : volume 2,1M · liquidité 340K · 12K parieurs  | | ≈ 6,76 parts à 37  |
Description (anglais original)                       | | Spread 1,2 · Frais 0|
Critères de résolution + source officielle           | | Paiement max 676   |
Carnet d'ordres (POLY) ou « Prix miroir » (MANI)     | | Bénéfice max +426  |
Activité externe récente · Commentaires (lecture)    | | [Acheter OUI       |
Marchés du même thème                                | |  pour 250 Éclats]  |
                                                     | +--------------------+
```

Confirmation : « Prix vérifié à l'instant : 37,4 · votre estimation : 37,0 » ; si écart >
tolérance, reconfirmation obligatoire. Succès : reçu + [Voir ma position].

## 7. Fiche Manifold à choix multiples

```text
(MANI) Quel studio sort le meilleur film 2026 ?   (Prix miroir Manifold)
créateur @cine_fan · 412 parieurs · règles du créateur affichées
[ recherche réponse... ]                somme = 100 %
  Studio Ghibli     41%   [Acheter 42]     <- spread +1 appliqué
  A24               22%   [Acheter 23]
  Pixar             15%   [Acheter 16]
  … repli au-delà de 8 réponses
```

## 8. En jeu (destination principale)

```text
En-tête : 7 positions · 1 850 engagés · valeur 2 214 · P&L latent +364 (+19,7%)
          paiement max 4 100 · prochaine échéance dans 03:12:44
          favorables 5 / défavorables 2 · [mini courbe 24 h]
Segments : (Actifs)(Bientôt)(Fermés, résultat attendu)(À récupérer●)(Long terme)(Tous)
Tris : échéance ▾ · Filtres : source, issue, favorable…

+------------------------------------------------------------------+
| (POLY) Fed cut in July?            OUI · 6,76 parts    ⏱ 05:44:12|
| entrée 37,0 → actuel 45,4  ▲8.4 pts   [~~/\/~ sparkline]         |
| P&L latent +57 (+22,8%) · paiement potentiel 676                 |
| Le marché vous est actuellement favorable                        |
| (En direct · actualisé il y a 8 s)   [Voir][Renforcer][Vendre]   |
+------------------------------------------------------------------+
| (MANI) PSG champion ?  NON · fermé  (Fermé · résolution attendue)|
|  dernier prix conservé · actions de trading masquées             |
+------------------------------------------------------------------+
```

Détail inline déployable : lots, valeur nominale par lot, variations 1 h/24 h, spread, fraîcheur,
chronologie (achats, ventes, variations ±5 pts, fermeture, résolution), graphique plein écran
mobile avec marqueurs d'achat/vente et ligne de prix moyen.

## 9. Résultats

```text
[ Bandeau : « 1 240 Éclats à récupérer »  -> ancre vers la liste ]
Gagnés récemment
  ✔ Shutdown évité ?  mise 500 → paiement 1 240   [Récupérer 1 240 Éclats]
  ✔ SpaceX lancement  mise 100 → paiement 265     [Gain récupéré ✓] (gris)
Perdus récemment : ✘ liste sobre, P&L réalisé
Annulés : ↩ remboursement 180   [Récupérer le remboursement]
En attente de résolution : liste (Fermé · résolution en attente)
Stats : meilleur gain · pire perte · rentabilité par thème/source/horizon ·
        taux de réussite (jamais présenté seul)
```

Clic Récupérer : bouton « Récupération… » désactivé → confirmation serveur → animation de
transfert vers le compteur de solde (respecte reduced-motion) → « Gain récupéré · +1 240 Éclats ».

## 10. Portefeuille

```text
Valeur totale 14 904 = Disponibles 12 450 + Positions 2 214 + À récupérer 240
P&L aujourd'hui +102 · P&L total +2 904 · [graphique valeur]
Onglets : Vue générale | Ordres | Historique | Résultats | Registre d'Éclats
Registre : chaque mouvement (mise, vente, gain, remboursement) avec lien vers l'ordre
```

## 11. Favoris et Paramètres

Favoris : sous-onglets Événements | Thèmes suivis | Régions | Filtres enregistrés | Masqués.
Paramètres : deux niveaux (Mes préférences / Réglages du système), recherche de réglage,
descriptions permanentes, impacts hausse/baisse, portée du changement, historique, restauration ;
catalogue complet de la section 9.10 du hand-off.

## 12. Mobile spécifique

Fiche : barre OUI/NON fixe en bas ; ticket en bottom sheet ; graphique plein écran ; zones
tactiles ≥ 44 px. Position : carte verticale, proba + P&L + échéance visibles sans déploiement.
