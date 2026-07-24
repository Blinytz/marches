# Marchés — Hand-off complet pour Claude Code

Version du document : 1.3  
Périmètre produit : version 1.5 — Polymarket + Manifold  
Langue de l’application : français  
Public initial : usage strictement personnel, mono-utilisateur  
Priorité : qualité de l’interface, richesse des données, fiabilité comptable, coût minimal

---

## 0. Instructions impératives à Claude Code

Ce document est la source de vérité du projet. Ne pas remplacer une règle explicite par une interprétation personnelle. Lorsqu’un détail technique reste réellement indéterminé :

1. choisir l’option la plus simple, réversible et gratuite ;
2. documenter l’hypothèse dans `DECISIONS.md` ;
3. ne jamais inventer silencieusement une règle financière ;
4. ne jamais modifier le solde d’Éclats directement depuis le navigateur ;
5. ne jamais exécuter une transaction avec un prix uniquement issu du cache d’affichage ;
6. ne jamais considérer la date de clôture comme une garantie de date de résolution ;
7. ne jamais fusionner un marché Polymarket et un marché Manifold, même si leurs titres semblent identiques ;
8. construire et faire valider l’interface avec des données fictives réalistes avant de brancher le moteur de trading.
9. ne pas demander à l’utilisateur de fournir des captures du site Polymarket, celui-ci n’étant pas accessible depuis la France ;
10. ne jamais utiliser de VPN, proxy de contournement ou autre mécanisme destiné à éluder une restriction géographique.

Le résultat attendu n’est ni un clone graphique de Polymarket ni un prototype minimal générique. C’est une application personnelle originale, dense et agréable, qui reprend les qualités fonctionnelles d’un véritable marché de prédiction tout en utilisant les Éclats comme monnaie interne.

---

## 1. Vision du produit

### 1.1 Proposition de valeur

Marchés permet de consulter des marchés de prédiction provenant de Polymarket et de Manifold, puis de prendre des positions virtuelles avec des Éclats. Les questions, les probabilités externes, les évolutions de prix et les résolutions proviennent des plateformes sources. Aucune transaction réelle, aucun portefeuille crypto et aucun pari en argent ne sont réalisés sur ces plateformes.

L’utilisateur doit retrouver la sensation d’un véritable marché de prédiction :

- découvrir continuellement de nouvelles questions ;
- comparer son jugement au consensus ;
- acheter OUI ou NON ;
- voir une position prendre ou perdre de la valeur ;
- revendre avant l’échéance ;
- attendre une résolution ;
- revenir consulter les résultats ;
- mesurer ses performances par thème et dans le temps.

### 1.2 Objectifs prioritaires

1. Offrir une interface remarquable sur ordinateur et téléphone.
2. Donner accès à un maximum de données utiles sans surcharger la lecture.
3. Présenter en priorité des marchés correspondant aux préférences de l’utilisateur.
4. Mettre fortement en avant les échéances courtes, notamment moins de 24 heures.
5. Réduire l’américanisation du fil grâce aux préférences géographiques et thématiques.
6. Répercuter les prix et résolutions aussi rapidement que raisonnablement possible.
7. Maintenir un registre d’Éclats exact, auditable et idempotent, avec récupération manuelle des gains.
8. Utiliser uniquement des données et services gratuits dans la configuration par défaut.

### 1.3 Non-objectifs de la version 1.5

- Placer de véritables ordres sur Polymarket ou Manifold.
- Connecter un wallet crypto.
- Permettre à plusieurs utilisateurs d’influencer une probabilité locale commune.
- Reproduire la blockchain ou le moteur de marché complet des plateformes sources.
- Fusionner ou supprimer les doublons entre sources.
- Créer manuellement de nouveaux marchés internes.
- Publier des commentaires sur les plateformes sources.
- Ouvrir le produit au public sans étude juridique spécifique.
- Garantir que la résolution arrive au moment même où l’événement réel devient connu : la source externe reste l’oracle.

---

## 2. Terminologie normative

- **Événement** : sujet de haut niveau contenant un ou plusieurs marchés. Exemple : « Qui gagnera l’élection ? »
- **Marché** : proposition négociable avec une ou plusieurs issues. Chez Polymarket, un événement multi-candidats contient souvent plusieurs marchés binaires.
- **Issue** : résultat achetable, par exemple OUI, NON ou un candidat.
- **Source** : `POLYMARKET` ou `MANIFOLD`.
- **Probabilité affichée** : estimation publique provenant de la plateforme source.
- **Prix exécutable** : prix vérifié par le serveur au moment d’un achat ou d’une vente.
- **Part** : unité virtuelle détenue par l’utilisateur. Sa valeur nominale de paiement est configurable ; la valeur par défaut est 100 Éclats à la résolution.
- **Position** : ensemble des parts détenues sur une issue donnée.
- **Clôture** : moment à partir duquel la source n’accepte plus de transaction.
- **Résolution** : attribution officielle d’une issue gagnante par la source.
- **Annulation** : résolution invalide, N/A ou CANCEL entraînant le remboursement selon les règles de ce document.
- **Oracle** : plateforme source dont l’état officiel déclenche le règlement local.
- **Éclats disponibles** : solde non immobilisé.
- **Valeur de position** : valeur indicative calculée au prix de liquidation actuel.
- **P&L réalisé** : bénéfice ou perte définitivement constaté après vente ou résolution.
- **P&L latent** : bénéfice ou perte théorique sur les parts encore détenues.

---

## 3. Sources et politique de doublons

### 3.1 Principe

Tous les marchés publics exposés par les APIs de Polymarket et de Manifold doivent être accessibles dans la navigation générale ou la recherche, même s’ils portent sur le même fait ou utilisent un format non encore négociable localement. Aucun moteur de déduplication n’est requis pour la version 1.5.

### 3.2 Règles d’affichage

- Chaque carte affiche un badge de source impossible à confondre.
- Chaque page détail contient un lien vers le marché original.
- La recherche peut retourner plusieurs questions quasi identiques.
- Les doublons ne sont ni masqués ni regroupés automatiquement.
- Une section « Questions similaires » peut être ajoutée ultérieurement, mais elle est purement informative.
- Les filtres permettent d’afficher Polymarket, Manifold ou les deux.

### 3.3 Règles comptables

- Deux marchés similaires restent deux instruments financiers indépendants.
- Une position sur Polymarket n’est jamais compensée par une position sur Manifold.
- Chaque marché est résolu uniquement selon l’état de sa propre source.
- Si les deux sources prennent des décisions différentes, les deux règlements locaux reproduisent ces décisions différentes.
- La clé d’unicité externe est `(source, external_market_id)`.

---

## 4. Utilisateur, authentification et économie centrale

### 4.1 Mode initial

L’application est mono-utilisateur mais doit utiliser une authentification réelle. Ne pas coder un identifiant utilisateur en dur dans les règles métier. Prévoir une structure multi-utilisateur normale afin d’éviter une migration future difficile.

### 4.2 Source du solde

Le solde des Éclats appartient à l’écosystème central, pas au frontend d’Marchés. **Claude Code doit connecter l’application à l’écosystème Supabase déjà en place et au même portefeuille utilisé par les autres applications qui gagnent ou dépensent des Éclats.** Il doit commencer par inspecter le schéma, les fonctions et les conventions existants. Ne pas créer en production un second solde indépendant, une seconde monnaie ou une table concurrente.

Créer un adaptateur `EclatsWalletProvider` autour de l’existant afin d’isoler le moteur de marché du schéma concret. Pour le prototype visuel et les tests uniquement, un provider fictif compatible peut être utilisé :

```ts
interface EclatsWalletProvider {
  getBalance(userId: string): Promise<Money>;
  reserve(input: ReserveInput): Promise<LedgerResult>;
  release(input: ReleaseInput): Promise<LedgerResult>;
  debit(input: DebitInput): Promise<LedgerResult>;
  credit(input: CreditInput): Promise<LedgerResult>;
  getLedger(userId: string, cursor?: string): Promise<LedgerPage>;
}
```

Toutes les mutations doivent être transactionnelles, exécutées côté serveur et munies d’une clé d’idempotence.

### 4.3 Précision monétaire

- Ne jamais utiliser les flottants JavaScript pour les Éclats ou les parts.
- Utiliser `numeric/decimal` en base et une bibliothèque décimale côté serveur.
- Précision de stockage recommandée : `numeric(24, 8)`.
- Affichage courant : maximum 2 décimales d’Éclats.
- Conserver la précision complète en calcul interne.
- Arrondir seulement à l’affichage, sauf exigence explicite d’une source.

### 4.4 Registre central des réglages

Toute valeur fixée dans ce document doit être centralisée dans un registre de paramètres et non codée en dur dans les composants ou services. Chaque paramètre possède :

- une clé technique stable ;
- un libellé français ;
- une catégorie ;
- une valeur courante ;
- une valeur par défaut ;
- un type (`boolean`, entier, décimal, durée, pourcentage, liste) ;
- une unité affichée ;
- une valeur minimale et maximale lorsque pertinent ;
- une description en langage courant ;
- « Si vous augmentez cette valeur » ;
- « Si vous diminuez cette valeur » ;
- la portée du changement : immédiate, nouveaux ordres seulement, redémarrage requis ;
- la date, l’auteur et l’ancienne valeur ;
- un bouton « Restaurer la valeur par défaut ».

Les changements sensibles exigent une confirmation résumant leur effet avant enregistrement. Toutes les modifications sont historisées dans `system_setting_versions`. Ne jamais exposer un secret ou une URL administrative dans l’interface utilisateur ordinaire.

La page Paramètres comprend deux niveaux :

1. **Mes préférences** : apparence, contenu, favoris, mises rapides, notifications.
2. **Réglages du système** : économie, exécution, fraîcheur, synchronisation et filtres par défaut.

En mode mono-utilisateur, les deux niveaux sont accessibles au propriétaire. Conserver néanmoins une notion de rôle `owner/admin`.

---

## 5. Règles de trading unifiées

### 5.1 Valeur d’une part

Une part de l’issue gagnante paie la valeur `WINNING_SHARE_PAYOUT`, fixée par défaut à **100 Éclats**. Une part perdante paie 0.

Dans ce document, la valeur est exprimée en **Éclats**, jamais en euros. Si l’expression « une part vaut 100 euros » était littérale et non une confusion avec les Éclats, suspendre l’implémentation du moteur financier jusqu’à clarification, car cela modifierait le statut et le risque juridique du produit.

Si une issue vaut une probabilité `p` comprise entre 0 et 1, son prix théorique unitaire en Éclats est :

```text
prix_unitaire = p × WINNING_SHARE_PAYOUT
```

Exemple avec la valeur par défaut : à 0,37, une part coûte théoriquement 37 Éclats et paie 100 si elle gagne.

Modifier la valeur nominale ne change pas les cotes ni le rendement économique d’une mise : si la valeur passe de 100 à 200 Éclats, le coût d’une part double et une même mise achète deux fois moins de parts. Le paiement potentiel total reste donc approximativement identique. Ce réglage modifie surtout l’unité de comptage et la lisibilité du nombre de parts.

Chaque ordre et lot enregistre la valeur nominale applicable au moment de son achat. Une modification s’applique uniquement aux nouveaux achats. Les lots existants conservent leur valeur nominale historique jusqu’à leur vente ou leur résolution. La page de confirmation d’un changement doit avertir de cette coexistence temporaire. Les ventes FIFO respectent la valeur nominale de chaque lot.

### 5.2 Achat par montant

L’utilisateur saisit principalement une mise en Éclats. Le serveur calcule le nombre de parts :

```text
parts = montant_net / prix_moyen_unitaire
```

Le reçu de transaction indique au minimum :

- montant débité ;
- frais éventuels ;
- nombre de parts ;
- prix moyen ;
- paiement maximal ;
- bénéfice maximal ;
- date et identifiant de transaction.

### 5.3 Vente

- L’utilisateur peut vendre tout ou partie d’une position ouverte.
- La vente est interdite après fermeture locale du marché.
- Le produit de vente est crédité immédiatement après exécution serveur.
- Une vente ne modifie jamais le prix externe.
- La valeur affichée avant confirmation est une estimation ; le serveur retourne le prix définitif.

### 5.4 Prix Polymarket

Pour Polymarket :

- affichage principal : midpoint ou dernier prix selon disponibilité, clairement nommé ;
- achat : meilleur ask disponible ;
- vente : meilleur bid disponible ;
- si la taille dépasse le premier niveau, consommer virtuellement la profondeur du carnet et calculer un prix moyen pondéré ;
- une part locale correspond à une unité de profondeur externe pour le calcul simulé ;
- ne rien envoyer au carnet Polymarket ;
- refuser ou exécuter partiellement si la profondeur externe est insuffisante ;
- afficher le spread et le glissement estimé avant confirmation.

Le prix doit être relu côté serveur au moment de confirmer. Si l’écart entre l’estimation et le prix réel dépasse la tolérance configurée, demander une nouvelle confirmation au lieu d’exécuter.

Valeur par défaut de tolérance : 2 points de probabilité ou 5 % du prix, retenir la plus stricte. Rendre cette valeur configurable.

### 5.5 Prix Manifold

Manifold ne fournit pas le même CLOB que Polymarket. Pour la version 1.5 :

- utiliser la probabilité publique courante comme prix de référence ;
- appliquer un spread local symétrique configurable de 1 point de probabilité par défaut ;
- achat OUI à `min(0.99, p + 0.01)` ;
- vente OUI à `max(0.01, p - 0.01)` ;
- pour NON, utiliser la probabilité de NON `1 - p`, puis la même règle ;
- ne pas simuler l’impact que l’ordre aurait eu sur l’AMM Manifold ;
- afficher explicitement « Prix miroir Manifold » dans le détail d’exécution ;
- ne jamais présenter ce prix comme un véritable ordre placé chez Manifold.

Pour un marché `MULTIPLE_CHOICE` :

- chaque réponse est une issue distincte avec sa probabilité publique ;
- si `shouldAnswersSumToOne = true`, acheter une réponse revient à prendre position sur cette réponse gagnante ;
- appliquer le spread local à la probabilité de la réponse choisie ;
- afficher toutes les réponses, avec recherche ou repli si la liste est longue ;
- enregistrer l’identifiant externe de la réponse dans la position ;
- si les réponses sont résolues indépendamment, traiter chaque réponse comme un sous-marché binaire ;
- ne jamais supposer que les probabilités doivent totaliser 100 % lorsque la source indique le contraire.

Le spread local limite les achats-reventes sans coût et constitue un puits modéré d’Éclats. Il doit être centralisé dans la configuration et non dispersé dans le code.

### 5.6 Frais

- Polymarket : reproduire les frais disponibles pour le marché lorsque l’API les expose et que leur formule est déterministe.
- Manifold : aucun frais externe réel ; seul le spread local s’applique en v1.5.
- Afficher 0 lorsque les frais sont réellement nuls.
- Ne jamais inventer des frais non documentés.
- En cas d’incertitude sur une formule de frais, désactiver temporairement la transaction concernée et journaliser l’erreur.

### 5.7 Ordres pris en charge

Version 1.5 obligatoire :

- achat au marché ;
- vente au marché ;
- vente partielle ;
- fermeture complète d’une position.

Ordres limités : préparer le modèle de données mais ne pas les rendre disponibles avant que les ordres au marché soient validés. Un futur ordre limité sera un ordre local déclenché par le prix externe, jamais envoyé à la source.

### 5.8 Coût moyen et lots

Utiliser une comptabilité par lots FIFO pour le P&L réalisé. Afficher également le prix moyen pondéré de la position pour la lisibilité.

À chaque achat, créer un `position_lot`. À chaque vente, consommer les lots les plus anciens. Ne jamais recalculer rétroactivement les transactions historiques à partir des prix actuels.

---

## 6. Éligibilité des marchés au trading

### 6.1 Polymarket

Tradable si toutes les conditions suivantes sont vraies :

- marché actif ;
- marché non fermé et non résolu ;
- ordres acceptés par la source ;
- identifiants d’issues présents ;
- prix serveur récupérable ;
- au moins une liquidité achetable ou vendable selon l’action ;
- critères de résolution et source accessibles ;
- heure serveur antérieure à la clôture.

### 6.2 Manifold

Tous les marchés publics Manifold doivent être importés, recherchables et consultables, y compris les choix multiples et les formats atypiques. Sont négociables en v1.5 :

- marchés `BINARY` ;
- marchés `MULTIPLE_CHOICE`, qu’ils soient à somme égale à 100 % ou à réponses indépendantes, dès lors que chaque réponse possède un identifiant et une probabilité exploitable ;
- marchés publics ;
- `isResolved = false` ;
- `closeTime` absent ou futur ;
- probabilité valide entre 0 et 1 ;
- description ou critères non vides ;
- monnaie source `MANA`, sauf décision future explicite concernant `CASH`.

Les types `FREE_RESPONSE`, `NUMERIC`, `PSEUDO_NUMERIC`, `BOUNTIED_QUESTION` et `POLL` restent accessibles en lecture seule tant que leur mécanique exacte n’est pas implémentée. Ils ne doivent jamais disparaître de la recherche générale ou de la navigation « Tout ». Afficher clairement « Consultable — trading non pris en charge ».

### 6.3 Données douteuses

Un marché reste consultable mais non négociable lorsque :

- prix absent ou incohérent ;
- source inaccessible ;
- statut contradictoire ;
- clôture passée mais résolution absente ;
- règles de résolution supprimées ;
- format non pris en charge.

L’interface doit expliquer la raison exacte, pas afficher seulement « erreur ».

---

## 7. Résolution et règlement

### 7.1 Oracle

La plateforme source est l’unique oracle. Ne jamais résoudre localement un marché à partir d’un article de presse, d’un score sportif ou d’une interprétation humaine.

### 7.2 Polymarket

Détecter la résolution par :

1. événement WebSocket `market_resolved` lorsque la connexion est active ;
2. vérification REST périodique pour rattrapage ;
3. réconciliation quotidienne de toutes les positions non réglées.

Ne régler qu’après réception d’une issue gagnante explicite. Vérifier que l’identifiant gagnant appartient bien au marché stocké.

### 7.3 Manifold

Détecter la résolution via les mises à jour WebSocket ou REST. Utiliser `isResolved`, `resolution` et `resolutionTime`.

- `YES` : parts OUI gagnantes.
- `NO` : parts NON gagnantes.
- `CANCEL` : remboursement selon 7.7.
- `MKT` ou résolution partielle : ne pas improviser. Si `resolutionProbability` est disponible, calculer proportionnellement ; sinon mettre en état `REVIEW_REQUIRED` et ne créer aucun claim récupérable.
- choix multiple à réponse unique : l’issue résolue gagnante reçoit 100 % de sa valeur nominale ;
- choix multiple pondéré : chaque lot reçoit `valeur_nominale × pourcentage_de_résolution` ;
- choix multiple à réponses indépendantes : régler chaque réponse comme son propre résultat OUI/NON.

### 7.4 Création du gain récupérable

Pour une position gagnante :

```text
paiement = somme, pour chaque lot gagnant, de (parts_restantes × valeur_nominale_du_lot)
```

Pour une position perdante : paiement 0.

**La résolution ne crédite jamais automatiquement le solde d’Éclats.** Elle calcule le résultat et crée un gain récupérable. Le traitement de résolution crée :

- un enregistrement de settlement ;
- la clôture de la position ;
- le P&L réalisé ;
- un enregistrement `payout_claim` à l’état `CLAIMABLE` si un montant positif doit être récupéré ;
- une notification « Gain disponible » ou « Remboursement disponible » ;
- aucune écriture de crédit dans le portefeuille central à cette étape.

États normatifs :

```text
UNRESOLVED → RESOLVED_WON → CLAIMABLE → CLAIMING → CLAIMED
UNRESOLVED → RESOLVED_LOST
UNRESOLVED → CANCELLED → REFUND_CLAIMABLE → CLAIMING → CLAIMED
```

Un gain récupérable n’expire pas en version 1.5. Il reste visible jusqu’à l’action de l’utilisateur.
Chaque résultat possède son propre bouton. Ne pas ajouter de bouton « Tout récupérer » en version 1.5 : la récupération individuelle fait partie de l’expérience satisfaisante recherchée.

### 7.5 Action manuelle « Récupérer »

Pour toute résolution gagnante, afficher un bouton principal très visible :

```text
Récupérer 1 240 Éclats
```

Au clic, le serveur doit :

1. authentifier l’utilisateur ;
2. vérifier qu’il possède le claim ;
3. verrouiller la ligne ou utiliser une fonction atomique Supabase ;
4. vérifier l’état `CLAIMABLE` ou `REFUND_CLAIMABLE` ;
5. créer une écriture de crédit unique dans le portefeuille d’Éclats commun ;
6. passer le claim à `CLAIMED` avec date, montant et identifiant du ledger ;
7. retourner le solde avant et après ;
8. déclencher l’expérience visuelle de récupération.

Le bouton n’est actionnable qu’une fois, y compris en cas de double clic, double requête, rafraîchissement ou ouverture sur deux appareils. La garantie est assurée côté base, pas seulement par un bouton désactivé.

Clé d’idempotence recommandée :

```text
claim:{user_id}:{settlement_id}
```

Pendant la requête : bouton désactivé avec « Récupération… ». Après succès : bouton gris durable avec icône de validation et texte :

```text
Gain récupéré · +1 240 Éclats
```

Le nouvel état doit survivre au rechargement. Une erreur réseau ne doit pas permettre de deviner le résultat : relire le claim et le ledger avant d’autoriser une nouvelle tentative.

### 7.6 Expérience satisfaisante de récupération

Avant le clic :

- encart lumineux mais élégant « X Éclats vous attendent » ;
- bouton accentué, montant inclus dans le libellé ;
- présence dans Résultats, En jeu/À récupérer, accueil et centre de notifications ;
- badge persistant sur la navigation tant qu’un gain reste non récupéré.

Le solde principal affiché dans l’en-tête correspond strictement aux Éclats déjà présents dans le portefeuille central : il n’inclut pas les claims. Afficher séparément `+ X à récupérer`. Dans le portefeuille, la valeur patrimoniale peut inclure les claims, mais la ventilation `Disponibles / Positions / À récupérer` est obligatoire afin de ne jamais laisser croire que le gain est déjà dépensable.

Après validation serveur :

- animation de transfert visuel depuis le gain vers le compteur de solde ;
- compteur passant du solde précédent au nouveau solde ;
- éclat cristallin bref ;
- vibration légère uniquement si la plateforme l’autorise et si l’utilisateur ne l’a pas désactivée ;
- récapitulatif : mise, paiement, bénéfice net ;
- bouton grisé « Gain récupéré » ;
- possibilité d’ouvrir l’écriture correspondante dans le registre.

L’animation ne doit jamais précéder la confirmation serveur. Respecter `prefers-reduced-motion` avec une transition simple et immédiate. Aucun son automatique.

### 7.7 Annulation

En cas d’annulation explicite par la source :

- calculer le coût d’acquisition restant des lots encore détenus comme remboursement récupérable ;
- ne pas rembourser les parts déjà revendues ;
- ne pas créer de gain spéculatif ;
- enregistrer la raison et l’état source brut ;
- créer un bouton « Récupérer le remboursement » soumis aux mêmes garanties que le gain ;
- ne pas créditer automatiquement ;
- rendre le calcul et la récupération idempotents.

### 7.8 Retard et contestation

- La clôture n’est pas la résolution.
- Afficher `Fermé — résolution en attente` tant que l’oracle n’a pas tranché.
- Aucun paiement anticipé.
- Conserver la dernière probabilité mais ne plus permettre de transaction.
- Si une source modifie une résolution avant récupération, geler le claim et recalculer après validation.
- Si une source modifie ultérieurement une résolution déjà récupérée, ne pas débiter automatiquement le solde. Créer une alerte `RESOLUTION_CHANGED` nécessitant une décision explicite. Cette situation doit être rare et entièrement auditée.

### 7.9 Idempotence

Clé recommandée :

```text
settlement:{source}:{external_market_id}:{source_resolution_timestamp}
```

Une deuxième exécution avec la même clé ne doit produire aucune écriture supplémentaire.

La détection/résolution et la récupération sont deux opérations idempotentes différentes. La première crée le claim ; la seconde, déclenchée exclusivement par l’utilisateur, crédite le portefeuille.

---

## 8. Personnalisation, favoris et navigation

### 8.1 Trois mécanismes distincts

1. **Favori individuel** : étoile sur un événement ou marché.
2. **Abonnement thématique** : suivre un thème, un pays, une région, une personnalité ou une série.
3. **Filtre enregistré** : mémoriser une combinaison de critères.

### 8.2 Navigation principale

Ordre desktop :

```text
Pour moi | 24 h | France & Europe | Nouveaux | Populaires | Thèmes | Ma liste
```

Sur mobile, navigation inférieure :

```text
Marchés | Recherche | Portefeuille | Résultats
```

Les sections secondaires sont accessibles depuis Marchés et le menu de compte.

### 8.3 Filtres obligatoires

- source : toutes, Polymarket, Manifold ;
- thème ;
- pays ;
- région ;
- résolution attendue ;
- statut ;
- probabilité ;
- volume minimal ;
- liquidité minimale lorsque disponible ;
- tradable uniquement ;
- favoris uniquement ;
- avec ou sans position ouverte.

### 8.4 Horizons temporels

Raccourcis :

- moins d’une heure ;
- moins de 6 heures ;
- moins de 24 heures ;
- moins de 3 jours ;
- moins de 7 jours ;
- moins de 30 jours ;
- plus tard ;
- date personnalisée.

Toujours distinguer `close_at` et `expected_resolution_at`. Si seule la clôture est connue, afficher « clôture dans… » et ne pas prétendre connaître exactement la résolution.

### 8.5 Tris obligatoires

- pertinent pour moi ;
- résolution la plus proche ;
- nouvellement créé ;
- plus gros volume ;
- plus forte variation sur 24 h ;
- probabilité la plus proche de 50 % ;
- activité récente.

### 8.6 Taxonomie française

Créer une taxonomie canonique indépendante des libellés externes :

- France ; Europe ; Monde ;
- Politique ; Géopolitique ; Société ; Justice ;
- Économie ; Entreprises ; Finance ;
- Technologie ; Intelligence artificielle ; Internet ;
- Sciences ; Espace ; Santé ; Climat et environnement ;
- Cinéma ; Télévision ; Musique ; Jeux vidéo ; Culture ;
- Sport ; Insolite.

Un événement peut posséder plusieurs thèmes et plusieurs régions. Maintenir une table de correspondance explicite entre tags externes et thèmes canoniques. Ne pas demander un modèle d’IA à chaque affichage.

### 8.7 Fil personnalisé déterministe

Version initiale sans modèle opaque. Calculer un score à partir de :

- thèmes suivis : fort bonus ;
- régions suivies : fort bonus ;
- résolution inférieure à l’horizon préféré : fort bonus ;
- marché tradable : bonus ;
- fraîcheur : bonus ;
- activité et volume : bonus modéré ;
- thème ou entité masqué : exclusion ;
- politique locale américaine si non suivie : malus ;
- répétition excessive d’un même thème : malus de diversité ;
- résolution lointaine : malus, sans exclusion totale.

Les poids doivent être configurables dans une table ou un objet central. Enregistrer les consultations, favoris, masquages et transactions pour une personnalisation future, mais ne pas modifier automatiquement les préférences explicites.

### 8.8 Accueil personnalisé

Ordre recommandé :

1. Résolution dans les prochaines 24 heures.
2. Nouveaux marchés dans les thèmes suivis.
3. France et Europe.
4. Mouvements importants parmi favoris et positions.
5. Résolution cette semaine.
6. Long terme à surveiller, section volontairement courte.

---

## 9. Architecture de l’information et écrans

### 9.1 Shell global desktop

- largeur maximale du contenu : 1440 px ;
- barre principale fixe de 64 px ;
- barre de catégories facultativement fixe de 44 px ;
- recherche globale accessible au clavier avec `/` ou `Ctrl/Cmd+K` ;
- solde et valeur du portefeuille visibles en permanence ;
- indicateur de connexion temps réel ;
- menu profil, préférences et notifications.

### 9.2 Accueil

L’accueil ne doit pas être un mur uniforme de cartes. Mélanger :

- listes compactes pour les événements multi-issues ;
- cartes éditoriales pour les événements à la une ;
- rangées horizontales sur mobile ;
- tableau dense optionnel sur grand écran.

Chaque carte affiche :

- image ou icône ;
- titre français ou original ;
- badge source ;
- thème principal ;
- probabilité principale ;
- variation 24 h ;
- volume ;
- clôture ou résolution attendue ;
- état tradable ;
- boutons rapides OUI et NON si binaire ;
- étoile favori ;
- menu masquer/suivre.

### 9.3 Recherche et exploration

- recherche plein texte ;
- suggestions dès la saisie ;
- historique local des recherches ;
- filtres visibles sous forme de chips ;
- panneau de filtres avancés ;
- compteur de résultats ;
- possibilité d’enregistrer le filtre ;
- affichage de la source sur chaque résultat ;
- aucune déduplication entre sources.

### 9.4 Page événement/marché desktop

Disposition à deux colonnes : contenu principal flexible et ticket de transaction fixe de 360 à 400 px.

Contenu, dans cet ordre :

1. fil d’Ariane et badges ;
2. image, titre, favori, partage et lien source ;
3. probabilité, variation et statut ;
4. graphique ;
5. issues ou sous-marchés ;
6. statistiques synthétiques ;
7. description ;
8. critères de résolution ;
9. source de résolution ;
10. carnet d’ordres Polymarket ou explication du prix miroir Manifold ;
11. transactions externes récentes ;
12. commentaires externes en lecture seule ;
13. marchés du même thème.

Le graphique propose : 1 h, 6 h, 1 j, 1 sem., 1 mois, tout. Afficher au survol date, prix et volume lorsque disponible. Utiliser des chiffres tabulaires.

### 9.5 Ticket de transaction

États : achat, vente, confirmation, succès, erreur.

Champs et informations :

- issue choisie ;
- prix indicatif ;
- source ;
- montant en Éclats ;
- raccourcis 50, 100, 250, 500, Max ;
- nombre de parts estimé ;
- prix moyen estimé ;
- spread ;
- frais ;
- paiement potentiel ;
- bénéfice potentiel ;
- avertissement sur variation de prix ;
- bouton principal explicite : « Acheter OUI pour 250 Éclats ».

La confirmation finale doit afficher le prix serveur réellement vérifié. Après succès, montrer le reçu et proposer « Voir ma position ».

### 9.6 En jeu — paris et positions en attente

Cette page est une destination principale, pas un sous-écran administratif. Elle doit donner envie de revenir suivre les paris en cours. Ajouter « En jeu » à la navigation desktop et rendre la section directement accessible depuis l’accueil et le solde. Sur mobile, l’accès se trouve dans Marchés ainsi que via un compteur de positions actives.

#### Objectif émotionnel

L’utilisateur doit ressentir simultanément :

- l’attente du résultat ;
- la progression ou la dégradation de son intuition ;
- la proximité de l’échéance ;
- la valeur concrète risquée et potentiellement gagnée ;
- la satisfaction de voir le marché évoluer depuis son entrée.

Ne pas fabriquer une fausse progression : une probabilité n’est pas un pourcentage d’accomplissement. Les formulations doivent rester exactes. Dire « le marché vous est actuellement favorable » et non « pari gagné à 72 % ».

#### En-tête de page

Afficher :

- nombre de positions ouvertes ;
- coût total encore exposé ;
- valeur liquidative actuelle ;
- P&L latent total, en Éclats et en pourcentage ;
- paiement maximal si toutes les positions gagnent ;
- prochain événement à clôturer ou se résoudre avec compte à rebours ;
- répartition positions actuellement favorables/défavorables ;
- mini-courbe de valeur du portefeuille ouvert sur 24 h ou 7 jours.

#### Segments

- **Actifs** : marchés encore négociables.
- **Bientôt** : échéance attendue dans moins de 24 h.
- **Fermés, résultat attendu** : plus de transaction, oracle non résolu.
- **À récupérer** : résultats gagnants ou remboursements dont les Éclats n’ont pas encore été réclamés.
- **Long terme** : au-delà de 30 jours.
- **Tous**.

Filtres : source, thème, issue OUI/NON, échéance, favorable/défavorable, avec mouvement important. Tris : résolution la plus proche, variation depuis l’achat, plus gros enjeu, meilleur P&L, pire P&L, achat le plus récent.

#### Carte riche d’une position

Chaque carte ou ligne développable doit fournir sans ouvrir une autre page :

- image et titre ;
- badge Polymarket/Manifold ;
- issue détenue ;
- état `En direct`, `Fermé`, `Résolution attendue`, `Données retardées` ;
- date/heure de clôture et résolution attendue, avec niveau de confiance ;
- montant initial engagé ;
- montant net encore exposé après ventes partielles ;
- nombre de parts restantes ;
- valeur nominale applicable aux lots ;
- prix moyen d’entrée ;
- probabilité au premier achat ;
- probabilité actuelle ;
- variation depuis l’entrée en points et en pourcentage ;
- variation sur 1 h et 24 h ;
- valeur liquidative actuelle ;
- P&L latent en Éclats et pourcentage ;
- paiement potentiel à la résolution ;
- bénéfice potentiel net ;
- spread actuel et fraîcheur du prix ;
- sparkline depuis le premier achat ;
- boutons `Voir`, `Renforcer`, `Vendre` si autorisés ;
- étoile favori et réglage de notification.

La carte compacte montre les éléments essentiels. Le développement inline révèle les détails afin d’éviter une page illisible.

#### Graphique de suivi

Pour chaque position, le graphique détaillé doit :

- commencer par défaut au premier achat, avec option d’afficher tout l’historique ;
- montrer la probabilité de l’issue détenue, pas automatiquement celle du OUI ;
- placer des marqueurs d’achat, de renforcement et de vente ;
- afficher le prix moyen d’entrée comme ligne horizontale ;
- proposer 1 h, 6 h, 24 h, 7 j, tout ;
- donner au survol prix, valeur estimée de la position et P&L à cet instant ;
- distinguer visuellement les périodes où le marché était fermé ;
- afficher la dernière actualisation ;
- gérer les trous de données sans inventer une interpolation trompeuse.

#### Historique interne à la position

Une chronologie affiche :

- achat initial ;
- achats supplémentaires ;
- ventes partielles ;
- variations remarquables, par exemple ±5 points ;
- fermeture du marché ;
- proposition/résolution officielle si disponible ;
- règlement final.

Les variations remarquables sont générées automatiquement à partir des snapshots et ne doivent pas saturer la chronologie.

#### Micro-interactions satisfaisantes

- compteur de P&L animé brièvement lors d’une mise à jour, sans faire défiler chaque centième ;
- flash doux vert ou rouge sur la probabilité ;
- message contextuel neutre : « +8,4 points depuis votre achat » ;
- anneau de compte à rebours uniquement pour le temps, jamais pour la chance de gagner ;
- apparition satisfaisante de l’état « Gain disponible » à la résolution gagnante ;
- transition claire de `En jeu` vers `Résultats`, tout en conservant un raccourci « À récupérer » tant que le claim est ouvert ;
- possibilité de consulter le reçu de règlement depuis la notification ;
- respect de `prefers-reduced-motion` ;
- aucun son automatique.

#### Mobile

Une position utilise une carte verticale avec probabilité, P&L et échéance visibles sans déploiement. Le graphique s’ouvre dans un panneau plein écran. Les actions Renforcer/Vendre restent accessibles dans une barre basse, mais disparaissent dès la fermeture du marché.

#### États particuliers

- Aucune position : expliquer le principe et proposer des marchés courts personnalisés.
- Prix indisponible : conserver le dernier prix daté et suspendre les actions si nécessaire.
- Fermé non résolu : remplacer les boutons de trading par les règles et la source de résolution.
- Plusieurs lots avec valeurs nominales différentes : présenter un détail par lot et un paiement agrégé.
- Position entièrement vendue : quitter En jeu et rester dans l’historique.

### 9.7 Portefeuille

En-tête :

- valeur totale ;
- Éclats disponibles ;
- valeur liquidative des positions ;
- P&L aujourd’hui ;
- P&L total ;
- graphique de valeur.

Onglets :

- Vue générale ;
- Ordres ;
- Historique ;
- Résultats ;
- Registre d’Éclats.

Le portefeuille renvoie vers la page En jeu pour le détail des positions actives. Il reste centré sur la vision patrimoniale globale et l’historique.

### 9.8 Résultats

- bandeau prioritaire « Éclats à récupérer » avec total non crédité ;
- gagnés récemment avec bouton individuel `Récupérer X Éclats` ;
- perdus récemment ;
- annulés avec bouton de remboursement lorsqu’il existe ;
- en attente de résolution ;
- gains disponibles mais non récupérés ;
- gains déjà récupérés avec bouton grisé permanent ;
- meilleur gain ;
- pire perte ;
- rentabilité par thème, source et horizon ;
- taux de réussite, mais ne pas le présenter seul sans rentabilité.

La résolution déclenche l’apparition du gain disponible mais ne touche pas au solde. L’animation de transfert et le compteur de solde sont déclenchés uniquement après clic et confirmation serveur du claim. Respecter `prefers-reduced-motion`.

### 9.9 Favoris

Sous-onglets :

- Événements favoris ;
- Thèmes suivis ;
- Régions suivies ;
- Filtres enregistrés ;
- Éléments masqués.

### 9.10 Paramètres

La page ne doit pas être une simple liste de champs techniques. Utiliser des sections, une recherche de réglage, des descriptions permanentes et un panneau d’impact avant validation.

#### Économie

| Réglage | Défaut | Ce qu’il gère | Si on augmente | Si on diminue |
| --- | ---: | --- | --- | --- |
| Valeur nominale d’une part gagnante | 100 Éclats | Prix et paiement unitaire d’une part | Moins de parts pour une même mise, chiffres unitaires plus grands, rendement total inchangé | Plus de parts pour une même mise, chiffres unitaires plus petits, rendement total inchangé |
| Mise minimale | 10 Éclats | Plus petite transaction autorisée | Réduit les micro-transactions | Autorise des essais moins risqués mais augmente le nombre d’écritures |
| Mise maximale par ordre | 10 000 Éclats | Risque maximal d’une seule action | Autorise des positions plus concentrées | Limite les erreurs et les pertes brutales |
| Exposition maximale par marché | 25 % du solde | Concentration autorisée sur une question | Permet des convictions fortes | Force la diversification |
| Spread miroir Manifold | 1 point | Écart local entre achat et vente | Rend l’aller-retour plus coûteux et brûle plus d’Éclats | Rend le trading plus généreux et plus exploitable |

La valeur nominale est étiquetée en Éclats. Une modification ne s’applique qu’aux nouveaux lots et exige une confirmation si des positions sont ouvertes.

#### Exécution

| Réglage | Défaut | Impact hausse | Impact baisse |
| --- | ---: | --- | --- |
| Tolérance de variation du prix | 2 points ou 5 % | Moins de reconfirmations, risque d’un prix moins favorable | Plus de contrôle, davantage de friction |
| Autoriser les exécutions partielles | Oui | Sans objet booléen : si activé, une partie peut être achetée | Si désactivé, tout l’ordre échoue lorsque la profondeur manque |
| Afficher le carnet avancé | Non | Préférence d’affichage, n’affecte pas les calculs | Interface plus simple |
| Valeurs de mises rapides | 50/100/250/500 | Boutons plus importants | Boutons adaptés aux petites mises |

#### Découverte

- horizon préféré, défaut 24 h ;
- sources visibles ;
- thèmes et régions suivis ;
- catégories masquées ;
- volume et liquidité minimaux ;
- afficher ou masquer les marchés non négociables ;
- poids de personnalisation avancés, cachés derrière un mode expert ;
- restauration du profil de recommandation par défaut.

Chaque réglage explique comment une hausse ou une baisse modifie le nombre et l’ordre des marchés affichés.

#### Fraîcheur et synchronisation — mode avancé

- métadonnées, défaut 5 minutes ;
- vérification des positions, défaut 1 minute lorsque possible ;
- seuil « données retardées », défaut 2 minutes pour une position ouverte ;
- réconciliation générale, défaut quotidienne.

Pour chaque durée : diminuer améliore la fraîcheur mais augmente les requêtes et la consommation ; augmenter économise les ressources mais retarde les nouveautés et règlements. Appliquer des bornes compatibles avec les limites des APIs.

#### Interface et notifications

- thème sombre/clair/système ;
- densité confortable/compacte ;
- contenu des marchés en anglais original ;
- mouvement normal/réduit ;
- matrice complète de notifications définie en section 18 ;
- seuils, canaux, sources, thèmes, fréquence et heures silencieuses ;
- Web Push facultatif et centre interne obligatoire ;
- aucune notification sonore automatique.

#### Comportement des modifications

- Prévisualiser l’impact avant sauvegarde.
- Signaler les positions ou ordres concernés.
- Conserver historique et auteur.
- Permettre la restauration individuelle et globale.
- Les valeurs économiques actives sont relues côté serveur ; le client ne fait que les afficher.
- Les réglages système ne peuvent pas être modifiés hors rôle owner/admin.

#### Catalogue initial obligatoire

| Clé | Défaut | Portée du changement |
| --- | ---: | --- |
| `WINNING_SHARE_PAYOUT` | 100 Éclats | Nouveaux lots seulement |
| `MIN_ORDER_AMOUNT` | 10 Éclats | Immédiate pour les nouveaux ordres |
| `MAX_ORDER_AMOUNT` | 10 000 Éclats | Immédiate pour les nouveaux ordres |
| `MAX_MARKET_EXPOSURE_PERCENT` | 25 % | Immédiate pour les nouveaux ordres |
| `MANIFOLD_LOCAL_SPREAD` | 0,01 | Nouveaux ordres Manifold |
| `PRICE_TOLERANCE_POINTS` | 0,02 | Nouvelles confirmations |
| `PRICE_TOLERANCE_RELATIVE` | 5 % | Nouvelles confirmations |
| `ALLOW_PARTIAL_FILLS` | vrai | Nouveaux ordres Polymarket |
| `QUICK_STAKE_AMOUNTS` | 50, 100, 250, 500 | Interface immédiate |
| `PREFERRED_RESOLUTION_HOURS` | 24 h | Fil personnalisé immédiat |
| `DEFAULT_SOURCE_FILTER` | les deux | Navigation immédiate |
| `SHOW_READ_ONLY_MARKETS` | faux dans Pour moi, vrai dans Tout | Navigation immédiate |
| `MIN_DEFAULT_VOLUME` | 0 | Navigation immédiate ; conserver le maximum de données par défaut |
| `METADATA_SYNC_SECONDS` | 300 s | Prochaine tâche planifiée |
| `OPEN_POSITION_SYNC_SECONDS` | 60 s | Prochaine tâche planifiée |
| `STALE_PRICE_SECONDS` | 120 s | Interface immédiate |
| `PRICE_SNAPSHOT_SECONDS` | 300 s | Prochaine collecte |
| `FULL_RECONCILIATION_HOURS` | 24 h | Prochaine tâche planifiée |
| `NOTIFY_PRICE_MOVE_POINTS` | 5 points | Notifications futures |
| `CLOSING_ALERT_MINUTES` | 60 min | Notifications futures |
| `UNCLAIMED_FIRST_REMINDER_HOURS` | 24 h | Prochain rappel de gain non récupéré |
| `UNCLAIMED_REPEAT_REMINDER_HOURS` | 72 h | Rappels suivants, désactivables |
| `HOME_SECTION_ITEM_LIMIT` | 12 | Interface immédiate |

Les variables d’environnement fournissent seulement les valeurs de bootstrap. Une fois la base initialisée, le registre versionné constitue la source de vérité. Claude Code doit rechercher les constantes numériques dans le code lors des tests et vérifier qu’aucune règle métier importante n’échappe au registre.

### 9.11 Mobile

- aucune réduction mécanique du layout desktop ;
- carte pleine largeur ;
- filtres dans un drawer ;
- panneau de transaction en bottom sheet ;
- barre OUI/NON fixe en bas de la fiche ;
- zones tactiles d’au moins 44 px ;
- graphiques manipulables au doigt ;
- contenu de résolution repliable mais facilement accessible.

---

## 10. Système visuel

### 10.1 Identité

Nom de travail : **Marchés**. Ne pas utiliser le logo, le nom graphique ou les éléments propriétaires de Polymarket/Manifold autrement que comme badges textuels de source et liens attributifs.

### 10.2 Direction

Interface premium, sombre par défaut, dense mais respirante. Éviter :

- gradients omniprésents ;
- grandes cartes vides ;
- effets glassmorphism excessifs ;
- boutons énormes ;
- animations lentes ;
- apparence de casino agressive ;
- copie pixel-perfect de Polymarket.

### 10.2.1 Références visuelles autorisées et méthode de conception

L’utilisateur ne peut pas accéder au site Polymarket depuis la France et ne fournira donc aucune capture de cette plateforme. Cela ne bloque ni la conception ni l’implémentation.

Claude Code doit construire l’interface à partir de :

- ce hand-off, qui constitue la référence fonctionnelle principale ;
- wireframes originaux créés pour Marchés ;
- l’interface publique de Manifold lorsqu’elle est accessible ;
- la documentation officielle Polymarket ;
- les champs, hiérarchies et exemples réellement renvoyés par les APIs publiques ;
- les composants et conventions visuelles déjà présents dans l’écosystème d’applications utilisant les Éclats ;
- les retours de l’utilisateur sur les captures du prototype local.

Ne pas utiliser l’absence de captures Polymarket comme prétexte pour créer une interface pauvre ou générique. Ne pas non plus tenter de reconstruire exactement un écran Polymarket supposé. L’objectif est une interface originale, plus satisfaisante pour cet usage personnel.

Avant de coder les composants finaux, produire des wireframes basse fidélité couvrant au minimum :

- accueil Pour moi ;
- navigation 24 h et filtres ;
- résultat de recherche avec doublons de sources ;
- fiche binaire ;
- fiche Manifold à choix multiples ;
- ticket d’achat et de vente ;
- page En jeu ;
- détail d’une position ;
- Résultats avec gain à récupérer ;
- animation et état final du bouton Récupérer ;
- Paramètres et notifications ;
- équivalents mobiles essentiels.

Ces wireframes sont des livrables de Phase A et doivent être validés ou transformés en prototype haute fidélité avant toute connexion financière.

### 10.3 Tokens sombres recommandés

```css
--bg: #090D14;
--surface-1: #0F1622;
--surface-2: #151E2C;
--surface-3: #1C2737;
--border: #263346;
--text-1: #F3F6FA;
--text-2: #A9B5C6;
--text-3: #718096;
--accent: #8B7CFF;
--accent-hover: #A195FF;
--yes: #20C997;
--yes-muted: #123D36;
--no: #FF6B6B;
--no-muted: #48252A;
--warning: #F5B942;
--info: #4DA3FF;
--success: #39D98A;
```

Créer également un thème clair cohérent. Valider un contraste WCAG AA pour tous les textes fonctionnels.

### 10.4 Typographie

- police principale : Inter via `next/font` ou police système équivalente ;
- titres : 600/700, jamais artificiellement gigantesques ;
- corps : 14 à 16 px ;
- métadonnées : 12 à 13 px ;
- chiffres : `font-variant-numeric: tabular-nums` ;
- longueur maximale des paragraphes de règles : environ 75 caractères par ligne.

### 10.5 Espacement et formes

- grille de base : 4 px ;
- espacements principaux : 8, 12, 16, 24, 32, 48 ;
- rayon carte : 12 px ;
- rayon boutons : 8 à 10 px ;
- ombres discrètes uniquement pour différencier les niveaux ;
- bordures plus importantes que les ombres dans le thème sombre.

### 10.6 Mouvement

- variation de prix : flash vert/rouge de 300 à 500 ms ;
- ouverture bottom sheet : 180 à 240 ms ;
- retour de transaction : immédiat, sans animation bloquante ;
- skeletons plutôt que spinners pour les pages ;
- mode mouvement réduit obligatoire.

---

## 11. États d’interface obligatoires

Implémenter et tester explicitement :

- chargement initial ;
- skeleton de carte et de graphique ;
- liste vide ;
- recherche sans résultat ;
- source indisponible ;
- données anciennes ;
- WebSocket déconnecté ;
- reconnexion ;
- marché fermé ;
- résolution en attente ;
- marché résolu ;
- marché annulé ;
- marché non négociable ;
- carnet vide ;
- profondeur insuffisante ;
- prix modifié avant confirmation ;
- transaction partiellement exécutée ;
- solde insuffisant ;
- double clic ou soumission répétée ;
- gain disponible non récupéré ;
- récupération en cours ;
- gain déjà récupéré ;
- double clic sur Récupérer ;
- récupération échouée avant ou après crédit, avec réconciliation ;
- image externe cassée ;
- erreur inconnue avec identifiant de support.

Toujours afficher l’âge des données : « En direct », « Actualisé il y a 18 s », « Données retardées ».

---

## 12. Intégration Polymarket

### 12.0 Vérification préalable d’accessibilité depuis la France

Le site de trading Polymarket n’est pas accessible à l’utilisateur en France. La documentation officielle indique néanmoins que les données de marché sont proposées par des endpoints REST publics, sans clé, authentification ni wallet. Ne pas en déduire automatiquement que tous les endpoints fonctionneront depuis chaque région ou hébergeur.

Avant de développer l’adaptateur complet, exécuter un spike technique depuis **l’environnement d’hébergement réellement prévu pour l’application**, sans VPN, proxy de contournement ou modification artificielle de la localisation.

Tester et consigner :

1. une requête Gamma de liste d’événements ;
2. une requête Gamma de détail d’événement et de marché ;
3. une requête CLOB de prix ;
4. une requête de carnet ;
5. une requête d’historique ;
6. une connexion au WebSocket Market Channel ;
7. la réception d’un message de prix ;
8. la possibilité de recevoir ou simuler proprement le traitement d’un message de résolution ;
9. les codes HTTP, latences et éventuelles restrictions observées ;
10. la conformité de l’usage envisagé avec la documentation et les conditions applicables.

Créer `docs/POLYMARKET_CONNECTIVITY_REPORT.md` avec la date, la région d’hébergement, les endpoints testés, les résultats et la conclusion `SUPPORTED`, `PARTIAL` ou `UNAVAILABLE`. Ne jamais inscrire de secret dans ce rapport.

Comportement selon le résultat :

- `SUPPORTED` : poursuivre l’intégration normale ;
- `PARTIAL` : activer seulement les capacités vérifiées et afficher clairement les données indisponibles ;
- `UNAVAILABLE` ou usage non autorisé : ne pas contourner la restriction, désactiver l’adaptateur Polymarket et livrer Manifold seul jusqu’à obtention d’une source autorisée.

L’application doit supporter cette désactivation par configuration, sans casser la navigation, les positions historiques ou le modèle de données. Si Polymarket devient indisponible ultérieurement, conserver les marchés et historiques déjà stockés en lecture seule.

### 12.1 APIs publiques

- Gamma API : événements, marchés, recherche, tags, séries, commentaires et métadonnées.
- CLOB API : prix, midpoint, spread, carnet, historique et dernier trade.
- Data API : trades, open interest, détenteurs et activité publique.
- WebSocket Market Channel : carnet, prix, meilleurs bid/ask, nouveaux marchés et résolutions.

Base documentaire : `https://docs.polymarket.com/market-data/overview`.

### 12.2 Ingestion de métadonnées

- Synchronisation incrémentale toutes les 5 minutes.
- Pagination complète lors du premier import.
- Importer événements actifs et marchés associés.
- Rafraîchir plus souvent les événements favoris, positions ouvertes et échéances proches.
- Conserver la réponse brute dans un champ JSONB pour diagnostic, en plus du schéma normalisé.
- Respecter les identifiants d’événement, de marché, de condition et de token.

### 12.3 Temps réel

Endpoint documenté :

```text
wss://ws-subscriptions-clob.polymarket.com/ws/market
```

Écouter au minimum :

- `book` ;
- `price_change` ;
- `last_trade_price` ;
- `best_bid_ask` ;
- `new_market` ;
- `market_resolved`.

Activer l’option requise pour les événements personnalisés documentés. Reconnexion avec backoff exponentiel, jitter, ping si requis et resynchronisation REST après reconnexion.

### 12.4 Données à conserver

- métadonnées normalisées ;
- dernier prix connu par issue ;
- meilleur bid/ask ;
- spread ;
- volume et liquidité ;
- statut ;
- dates ;
- résolution ;
- snapshots de prix nécessaires aux graphiques internes et au portefeuille ;
- payload brut de résolution.

Ne pas stocker chaque message de carnet indéfiniment. Conserver des snapshots agrégés selon la politique de rétention.

---

## 13. Intégration Manifold

### 13.1 API

Base : `https://api.manifold.markets/v0`.

Utiliser notamment :

- `GET /markets` pour les marchés récents ;
- `GET /market/[marketId]` pour le détail ;
- endpoints de recherche documentés ;
- endpoints de bets/comments en lecture seule si nécessaires à la fiche.

Limite actuelle documentée : 500 requêtes par minute et par IP. L’usage personnel et non commercial est autorisé sous réserve des conditions de l’API.

### 13.2 WebSocket

```text
wss://api.manifold.markets/ws
```

S’abonner à :

- `global/new-contract` ;
- `global/updated-contract` ;
- marchés favoris et positions via `contract/[marketId]` ;
- nouveaux paris externes lorsque la fiche est ouverte.

Envoyer un ping toutes les 30 à 60 secondes conformément à la documentation. Reconnexion et resynchronisation REST obligatoires.

### 13.3 Données principales

- `id` ;
- `question` ;
- `description` ;
- `createdTime` ;
- `closeTime` ;
- `probability` ;
- `outcomeType` ;
- `mechanism` ;
- `volume` ;
- `volume24Hours` ;
- `totalLiquidity` ;
- `uniqueBettorCount` ;
- `isResolved` ;
- `resolution` ;
- `resolutionTime` ;
- `resolutionProbability` ;
- `lastUpdatedTime` ;
- `lastBetTime` ;
- `token` ;
- groupes/tags ;
- créateur et URL.

### 13.4 Particularités

- Le créateur peut résoudre le marché ; un retard humain est possible.
- Les marchés subjectifs ne doivent pas être présentés comme objectifs.
- Afficher créateur, nombre de participants et règles de résolution.
- La probabilité Manifold sert de prix miroir, selon les règles 5.5.
- Conserver les marchés similaires à Polymarket : aucune déduplication.

---

## 14. Normalisation des données

Créer des adaptateurs source retournant un modèle commun sans perdre les champs spécifiques.

```ts
interface NormalizedMarket {
  id: string;
  source: 'POLYMARKET' | 'MANIFOLD';
  externalId: string;
  externalEventId?: string;
  sourceUrl: string;
  titleOriginal: string;
  titleFr?: string;
  descriptionOriginal?: string;
  descriptionFr?: string;
  resolutionRulesOriginal?: string;
  resolutionRulesFr?: string;
  resolutionSource?: string;
  marketType: 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC' | 'OTHER';
  status: 'OPEN' | 'CLOSED' | 'RESOLVING' | 'RESOLVED' | 'CANCELLED' | 'UNAVAILABLE';
  tradable: boolean;
  nonTradableReason?: string;
  createdAt?: string;
  closeAt?: string;
  expectedResolutionAt?: string;
  resolutionTimeConfidence: 'EXACT' | 'EXPECTED' | 'UNKNOWN';
  resolvedAt?: string;
  volume?: Decimal;
  volume24h?: Decimal;
  liquidity?: Decimal;
  openInterest?: Decimal;
  bettorCount?: number;
  imageUrl?: string;
  rawPayload: unknown;
}
```

Prévoir un modèle d’issue séparé avec prix, token externe, issue gagnante et ordre d’affichage.

---

## 15. Schéma de base recommandé

Tables minimales :

### Référentiel externe

- `data_sources`
- `external_events`
- `external_markets`
- `external_outcomes`
- `external_tags`
- `market_tag_links`
- `canonical_topics`
- `external_topic_mappings`
- `market_topic_links`
- `market_region_links`
- `price_snapshots`
- `source_sync_runs`
- `source_webhook_events` ou `source_realtime_events` à rétention courte
- `resolution_records`

### Utilisateur

- `profiles`
- `user_preferences`
- `event_favorites`
- `market_favorites`
- `topic_preferences`
- `region_preferences`
- `muted_entities`
- `saved_filters`
- `feed_interactions`
- `notification_preferences`
- `notifications`
- `push_subscriptions`

### Configuration

- `system_settings`
- `system_setting_versions`
- `user_setting_overrides` pour les préférences non financières

`system_settings` contient au minimum : clé, valeur JSON typée, type, unité, défaut, minimum, maximum, portée, libellé, description, impact hausse, impact baisse, sensibilité, date de modification et version. Les règles économiques lisent une version cohérente des réglages au début d’une transaction.

### Trading

- `wallets` si aucun portefeuille central n’existe
- `wallet_ledger`
- `orders`
- `trades`
- `positions`
- `position_lots`
- `settlements`
- `payout_claims`
- `portfolio_snapshots`

### Contraintes essentielles

- unicité `(source, external_id)` ;
- unicité des clés d’idempotence du ledger ;
- unicité du settlement par résolution source ;
- unicité d’un claim par utilisateur et settlement ;
- unicité de l’identifiant de ledger crédité par claim ;
- montants non négatifs là où nécessaire ;
- relations utilisateur protégées par RLS ;
- aucune suppression en cascade du ledger ;
- soft delete ou archivage pour marchés externes disparus.
- immutabilité des versions de réglages déjà référencées par un ordre ou un lot.

---

## 16. Synchronisation, cache et fraîcheur

### 16.1 Stratégie gratuite

- Interface ouverte : WebSockets directs ou relayés pour les prix et résolutions.
- Interface fermée : tâches planifiées serveur.
- Import métadonnées : toutes les 5 minutes.
- Vérification positions ouvertes et marchés favoris : toutes les minutes si l’infrastructure gratuite le permet, sinon fréquence minimale disponible documentée.
- Réconciliation globale : une fois par jour.

### 16.2 Source de lecture du frontend

Le frontend charge les listes depuis la base/cache interne, jamais en multipliant les appels aux plateformes pour chaque carte. Les données temps réel corrigent ensuite le cache visible.

### 16.3 Source de vérité transactionnelle

Au clic de confirmation :

1. recharger le statut source ;
2. recharger le prix exécutable ;
3. vérifier l’heure serveur ;
4. vérifier le solde ;
5. réserver/débiter les Éclats ;
6. créer l’ordre et le trade dans une transaction ;
7. mettre à jour les lots et la position ;
8. retourner un reçu.

### 16.4 Objectifs de réactivité

- interaction UI locale : moins de 100 ms ;
- contenu principal visible sur connexion correcte : moins de 1,5 s cible ;
- prix sur page ouverte : moins de 2 s après événement WebSocket cible ;
- règlement sur page ouverte : quelques secondes après événement source ;
- règlement en arrière-plan : moins de 2 minutes cible lorsque le planificateur le permet ;
- aucune promesse de règlement avant la plateforme source.

---

## 17. Traduction

### 17.1 Principe

L’interface, les catégories et les commandes sont françaises. **Les questions, descriptions, commentaires et règles des marchés peuvent rester en anglais en version 1.5.** L’anglais est accepté et ne doit pas bloquer l’import ou retarder l’affichage.

### 17.2 Comportement version 1.5

- afficher le contenu original immédiatement ;
- traduire manuellement uniquement la taxonomie, les statuts et les commandes de l’application ;
- ne rendre aucun service de traduction obligatoire ;
- conserver les champs `titleFr`, `descriptionFr` et `resolutionRulesFr` optionnels pour une évolution future ;
- si une traduction est ajoutée ultérieurement, l’original reste accessible et demeure la seule référence de résolution.

Ne pas intégrer une API payante de traduction dans la livraison initiale.

---

## 18. Notifications

Les notifications disposent d’une section dédiée et détaillée dans Paramètres. Chaque type peut être activé ou désactivé indépendamment, avec réglages par source, thème et canal lorsque pertinent.

### 18.1 Types

#### Découverte

- nouveau marché dans un thème ou une région suivie ;
- nouveau marché à résolution courte ;
- nouveau marché Polymarket ;
- nouveau marché Manifold ;
- marché populaire ou en forte activité ;
- nouvelle question similaire à un favori, sans déduplication.

#### Positions

- variation favorable d’une position ;
- variation défavorable ;
- franchissement du prix d’entrée ;
- variation absolue supérieure à X points ;
- P&L supérieur ou inférieur à un seuil d’Éclats ;
- clôture dans 24 h, 6 h, 1 h ou délai personnalisé ;
- marché fermé et résolution en attente ;
- résolution reçue ;
- gain disponible à récupérer ;
- remboursement disponible ;
- rappel de gain non récupéré après 1 jour, 3 jours ou délai choisi ;
- gain récupéré, confirmation locale uniquement par défaut.

#### Technique

- données retardées sur une position ouverte ;
- échec prolongé d’une source ;
- résolution modifiée ou claim gelé ;
- transaction ou récupération échouée.

### 18.2 Réglages

Pour chaque famille :

- interrupteur général ;
- centre interne et Web Push séparés ;
- seuil numérique lorsqu’il existe ;
- sources concernées ;
- thèmes concernés ;
- seulement favoris, seulement positions ou tous ;
- regroupement immédiat, résumé horaire ou quotidien ;
- heures silencieuses configurables ;
- jours silencieux ;
- fuseau horaire Europe/Paris par défaut ;
- bouton « Envoyer une notification de test » ;
- bouton « Restaurer les réglages par défaut ».

### 18.3 Valeurs par défaut

- résolution reçue : activée ;
- gain/remboursement disponible : activée et prioritaire ;
- rappel non récupéré : activé après 24 h puis tous les 3 jours, sans spam ;
- variation de position : activée à partir de 5 points ;
- clôture : 24 h et 1 h ;
- découverte : résumé quotidien, pas de push immédiat ;
- incidents techniques : centre interne seulement, sauf impact sur un claim ;
- heures silencieuses : 23 h–8 h, sauf gain disponible ou anomalie critique si l’utilisateur autorise les exceptions.

### 18.4 Anti-spam et UX

- ne jamais notifier chaque tick ;
- une seule notification par franchissement de seuil, réarmée après retour sous le seuil ;
- regrouper les marchés découverts ;
- cliquer ouvre directement la position ou le claim concerné ;
- marquer lu individuellement ou globalement ;
- conserver un historique paginé ;
- afficher un badge distinct pour les gains à récupérer ;
- demander la permission Web Push seulement après explication, jamais au premier écran.

---

## 19. Sécurité, intégrité et confidentialité

- RLS sur toutes les données utilisateur.
- Secrets uniquement côté serveur.
- Aucune clé administrative dans le bundle client.
- Validation de tous les inputs avec schémas partagés.
- Protection CSRF selon architecture.
- Rate limiting sur les mutations locales.
- Clé d’idempotence générée par le client et validée par le serveur.
- Verrou transactionnel ou stratégie optimiste sûre sur le portefeuille.
- Audit complet de chaque variation d’Éclats.
- URLs externes nettoyées et ouvertes avec protections appropriées.
- Contenus externes rendus sans HTML non fiable.
- Images externes avec fallback.
- Application privée ; aucune inscription publique en v1.5.
- Si le produit est ouvert à d’autres utilisateurs ou si les gains deviennent directement convertibles en argent, arrêter le déploiement public et demander une étude juridique.

---

## 20. Performance et coût

### 20.1 Principes

- Privilégier les endpoints publics gratuits.
- Cache serveur et pagination.
- Chargement différé des commentaires, du carnet complet et des gros historiques.
- WebSocket uniquement pour les marchés visibles, favoris ou détenus, plus les flux globaux nécessaires.
- Virtualiser les listes longues.
- Optimiser et mettre en cache les images dans le respect des conditions des sources.
- Limiter les snapshots historiques selon une politique de rétention.

### 20.2 Budget par défaut

La version initiale doit pouvoir fonctionner sur des offres gratuites ou à coût quasi nul. Aucun service payant obligatoire. Tout fournisseur payant doit être optionnel, derrière une interface et désactivé par défaut.

### 20.3 Dégradation acceptable

Si un service toujours actif gratuit n’est pas disponible :

- conserver les WebSockets dans le navigateur quand l’application est ouverte ;
- utiliser le planificateur gratuit disponible pour les résolutions hors ligne ;
- afficher honnêtement la dernière actualisation ;
- rattraper immédiatement à la prochaine ouverture.

---

## 21. Observabilité

Journaliser sans données sensibles :

- durée et résultat des synchronisations ;
- nombre de marchés créés/mis à jour ;
- déconnexions WebSocket ;
- latence des prix ;
- résolutions détectées ;
- règlements réussis/ignorés/échoués ;
- divergence entre cache et prix d’exécution ;
- erreurs par source ;
- échecs de traduction ;
- transactions refusées et motif.

Prévoir une page d’administration privée : santé des sources, dernière synchronisation, files d’erreurs, règlements en attente et possibilité de relancer une opération idempotente.

---

## 22. Tests obligatoires

### 22.1 Unitaires

- conversion probabilité/prix ;
- calcul du nombre de parts ;
- profondeur Polymarket et prix moyen ;
- spread Manifold ;
- FIFO ;
- P&L réalisé/latent ;
- résolution gagnante/perdante ;
- annulation ;
- résolution partielle Manifold ;
- résolution Manifold à choix multiple unique, pondérée et indépendante ;
- arrondis ;
- score de personnalisation ;
- filtres temporels ;
- distinction clôture/résolution.
- changement de valeur nominale avec lots existants ;
- absence d’impact de la valeur nominale sur le rendement d’une mise constante ;
- bornes, types et restauration des réglages ;
- calcul des indicateurs de la page En jeu ;
- courbe de position utilisant la probabilité de l’issue détenue.

### 22.2 Intégration

- import Polymarket ;
- import Manifold ;
- doublons conservés ;
- reconnexion WebSocket ;
- mutation atomique du wallet ;
- double soumission ;
- double événement de résolution ;
- création unique du claim sans crédit automatique ;
- double clic et double requête de récupération ;
- crédit central et passage à `CLAIMED` atomiques ;
- reprise après erreur réseau survenue pendant la récupération ;
- indisponibilité d’une source ;
- prix ayant changé entre prévisualisation et confirmation.

### 22.3 End-to-end

1. se connecter ;
2. filtrer sur moins de 24 h ;
3. suivre un thème ;
4. mettre un marché en favori ;
5. acheter OUI ;
6. constater la position ;
7. vendre partiellement ;
8. simuler une résolution ;
9. vérifier que le solde n’a pas été crédité et que le bouton Récupérer apparaît ;
10. cliquer une fois et vérifier animation, solde, ledger et bouton grisé ;
11. recliquer/recharger et vérifier l’absence de second crédit ;
12. consulter le résultat sur mobile ;
13. modifier la valeur nominale et vérifier l’avertissement sur les lots existants ;
14. vérifier que l’ancien lot conserve sa valeur et que le nouveau utilise la nouvelle ;
15. suivre une position dans En jeu, ouvrir sa courbe et vendre partiellement ;
16. acheter et résoudre une issue d’un marché Manifold à choix multiples ;
17. modifier les notifications puis envoyer une notification de test.

### 22.4 Visuels

Captures automatisées aux largeurs 375, 768, 1280 et 1440 px. Tester thème sombre et clair, textes longs, titres sur quatre lignes, absence d’image, grandes valeurs, connexion lente et mouvement réduit.

---

## 23. Stack recommandée

- Next.js stable avec App Router ;
- TypeScript strict ;
- React ;
- Tailwind CSS ;
- primitives accessibles de type Radix/shadcn, fortement personnalisées ;
- TanStack Query pour cache client ;
- Lightweight Charts pour les courbes de prix ;
- Supabase Auth/Postgres/RLS/Edge Functions si cohérent avec l’écosystème existant ;
- Zod pour validation ;
- bibliothèque Decimal ;
- Playwright pour E2E et screenshots ;
- Vitest pour unités ;
- PWA installable.

Ne pas changer de stack sans justification écrite dans `DECISIONS.md`.

---

## 24. Structure de projet suggérée

```text
src/
  app/
    (auth)/
    markets/
    discover/
    in-play/
    portfolio/
    results/
    favorites/
    settings/
    admin/
    api/
  components/
    market/
    trading/
    portfolio/
    filters/
    charts/
    layout/
    ui/
  features/
    personalization/
    notifications/
    claims/
  lib/
    sources/
      polymarket/
      manifold/
      normalized/
    trading/
    wallet/
    settlement/
    realtime/
    db/
    validation/
  styles/
supabase/
  migrations/
  functions/
tests/
  unit/
  integration/
  e2e/
docs/
  PRODUCT_SPEC.md
  UI_SPEC.md
  DATA_SOURCES.md
  TRADING_ENGINE.md
  DATABASE.md
  DECISIONS.md
  POLYMARKET_CONNECTIVITY_REPORT.md
  UI_REFERENCE_AND_WIREFRAMES.md
```

---

## 25. Variables de configuration

Prévoir au minimum :

```text
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
POLYMARKET_GAMMA_BASE_URL
POLYMARKET_CLOB_BASE_URL
POLYMARKET_DATA_BASE_URL
POLYMARKET_WS_URL
MANIFOLD_API_BASE_URL
MANIFOLD_WS_URL
MANIFOLD_LOCAL_SPREAD
WINNING_SHARE_PAYOUT
MIN_ORDER_AMOUNT
MAX_ORDER_AMOUNT
MAX_MARKET_EXPOSURE_PERCENT
PRICE_CHANGE_TOLERANCE
METADATA_SYNC_INTERVAL
SETTLEMENT_SYNC_INTERVAL
VAPID_PUBLIC_KEY_OPTIONAL
VAPID_PRIVATE_KEY_OPTIONAL
```

Fournir `.env.example` sans aucun secret.

---

## 26. Plan de réalisation imposé

### Phase 0 — Audit et spikes sans mutation

1. Lire intégralement ce hand-off.
2. Inspecter le dépôt et l’écosystème Supabase existant sans modifier le solde.
3. Identifier les conventions UI déjà utilisées par les autres applications d’Éclats.
4. Vérifier l’accès Manifold.
5. Réaliser le test Polymarket de la section 12.0 depuis l’hébergement cible.
6. Produire `POLYMARKET_CONNECTIVITY_REPORT.md`.
7. Lister les écarts entre les schémas API actuels et ce document.

**Gate 0 :** aucune intégration Polymarket complète si le rapport n’est pas `SUPPORTED` ou si les conditions d’usage ne permettent pas l’intégration. Aucun contournement géographique.

### Phase A — Fondations visuelles

1. Design tokens et composants de base.
2. Jeu de fixtures fictives riche couvrant les deux sources et tous les états listés ci-dessous.
3. Wireframes basse fidélité originaux, sans dépendre de captures Polymarket.
4. Shell desktop/mobile.
5. Accueil, recherche, fiche, ticket, En jeu, portefeuille, résultats, favoris et paramètres.
6. Tous les états d’erreur et chargement.
7. Prototype haute fidélité navigable.
8. Captures du **prototype Marchés** aux quatre largeurs.

Le fichier de fixtures doit inclure au minimum :

- événement Polymarket binaire ;
- événement Polymarket avec plusieurs sous-marchés ;
- marché Manifold binaire ;
- marché Manifold à choix multiples à somme 100 % ;
- marché Manifold à réponses indépendantes ;
- format Manifold atypique consultable en lecture seule ;
- marché court inférieur à 24 h ;
- marché long terme ;
- doublon apparent entre Polymarket et Manifold ;
- marché sans image ;
- titre et règles très longs en anglais ;
- marché sans prix, sans liquidité ou avec données retardées ;
- position favorable et défavorable ;
- vente partielle ;
- marché fermé en attente ;
- victoire avec claim non récupéré ;
- récupération en cours ;
- gain déjà récupéré ;
- défaite ;
- annulation avec remboursement récupérable ;
- panne de source et WebSocket déconnecté.

**Gate A :** hors spikes de connectivité strictement en lecture seule de Phase 0, aucune connexion persistante aux APIs et aucune mutation financière avant validation du prototype navigable.

### Phase B — Lecture réelle

1. Adaptateur Polymarket.
2. Adaptateur Manifold.
3. Normalisation et base.
4. Recherche, filtres, taxonomie et favoris.
5. Graphiques et données avancées.
6. WebSockets et indicateurs de fraîcheur.

**Gate B :** toutes les pages fonctionnent en lecture seule, les doublons sont présents et les sources sont clairement distinguées.

### Phase C — Trading simulé

1. Wallet local/adaptateur central.
2. Prévisualisation serveur.
3. Achat Polymarket.
4. Achat Manifold.
5. Vente totale et partielle.
6. Lots FIFO et portefeuille.
7. Idempotence et reçus.

**Gate C :** aucun écart comptable dans les tests de concurrence et double soumission.

### Phase D — Résolutions

1. Détection WebSocket.
2. Polling de rattrapage.
3. Gagné/perdu/annulé/partiel.
4. Création des claims sans crédit automatique.
5. Bouton Récupérer, animation et crédit atomique unique.
6. Notifications détaillées.
7. Réconciliation quotidienne.
8. Administration des anomalies.

**Gate D :** double événement de résolution sans double claim ; aucun crédit avant clic ; double clic sans double crédit ; résolution retardée correctement rattrapée.

### Phase E — Connexion à l’écosystème

1. Brancher le véritable portefeuille d’Éclats.
2. Migrer les transactions de test si souhaité, sinon les purger explicitement.
3. Tests bout en bout avec petit montant.
4. Déploiement privé.

---

## 27. Critères d’acceptation globaux

La v1.5 est acceptée lorsque :

- le rapport de connectivité documente l’accessibilité réelle de chaque capacité Polymarket sans contournement géographique ;
- l’application fonctionne en mode Manifold seul si Polymarket doit être désactivé ;
- lorsque les deux sources sont supportées, elles apparaissent dans le même catalogue sans déduplication ;
- l’utilisateur peut filtrer par source, thème, région et horizon ;
- le raccourci 24 h est immédiatement accessible ;
- la page En jeu expose pour chaque position l’entrée, le prix actuel, l’évolution, le P&L, le paiement potentiel et l’échéance ;
- les graphiques En jeu comportent les marqueurs d’achat et de vente ;
- le fil « Pour moi » favorise les préférences explicites ;
- chaque marché affiche clairement sa source et ses règles ;
- les prix visibles se mettent à jour sans rechargement lorsque l’app est ouverte ;
- un achat et une vente utilisent un prix revérifié côté serveur ;
- les positions et P&L sont exacts ;
- une résolution source crée un gain récupérable sans modifier le solde ;
- le bouton Récupérer crédite le portefeuille commun exactement une fois puis reste grisé avec la mention « Gain récupéré » ;
- l’actualisation du solde après récupération est visuellement satisfaisante et confirmée par le serveur ;
- tous les marchés publics des deux sources sont consultables et les marchés Manifold à choix multiples sont négociables ;
- une panne de WebSocket est récupérée par REST ;
- le frontend ne possède aucun droit direct de modification du ledger ;
- l’expérience mobile est réellement conçue pour le tactile ;
- l’UI a été conçue et validée à partir de wireframes et de captures du propre prototype, sans exiger de capture Polymarket de l’utilisateur ;
- toutes les valeurs fixes importantes sont centralisées et documentées dans Paramètres ;
- les notifications disposent de réglages détaillés par type, seuil, canal, source et fréquence ;
- modifier la valeur nominale n’altère pas rétroactivement les lots ouverts ;
- aucune API payante n’est nécessaire ;
- toutes les erreurs importantes disposent d’un état visuel compréhensible ;
- les tests critiques passent en CI ;
- la documentation de lancement et `.env.example` sont complètes.

---

## 28. Livrables attendus de Claude Code

À chaque phase, fournir :

- code fonctionnel ;
- migrations ;
- données de démonstration ;
- fixtures JSON réutilisables et documentées ;
- wireframes et prototype pour la Phase A ;
- tests ;
- captures desktop/mobile ;
- liste des décisions prises ;
- liste des limites connues ;
- instructions d’installation ;
- instructions de déploiement gratuit ;
- checklist de vérification manuelle.

Fournir également une fois :

- `docs/POLYMARKET_CONNECTIVITY_REPORT.md` ;
- `docs/UI_REFERENCE_AND_WIREFRAMES.md` expliquant la hiérarchie des écrans sans capture Polymarket fournie par l’utilisateur ;
- `tests/fixtures/README.md` décrivant chaque scénario fictif et l’état UI qu’il doit valider.

Avant de coder, Claude Code doit commencer par :

1. analyser ce document ;
2. créer les fichiers de documentation internes listés en section 24 ;
3. proposer un plan de tâches détaillé ;
4. signaler les contradictions éventuelles ;
5. exécuter la Phase 0 sans mutation puis la Phase A ;
6. attendre la validation visuelle avant les phases B à E.

---

## 29. Références officielles à consulter pendant l’implémentation

- Polymarket — vue d’ensemble des données : https://docs.polymarket.com/market-data/overview
- Polymarket — API et limites : https://docs.polymarket.com/api-reference/rate-limits
- Polymarket — canal temps réel : https://docs.polymarket.com/market-data/websocket/market-channel
- Polymarket — liste des marchés : https://docs.polymarket.com/api-reference/markets/list-markets
- Manifold — API officielle : https://docs.manifold.markets/api
- Manifold — règles générales et résolution : https://docs.manifold.markets/faq
- Manifold — conditions : https://docs.manifold.markets/terms

Les APIs externes évoluent. Lorsqu’un exemple de ce document diverge de la documentation officielle actuelle, conserver les règles produit de ce document mais adapter l’implémentation technique au schéma officiel, puis consigner le changement dans `DECISIONS.md`.
