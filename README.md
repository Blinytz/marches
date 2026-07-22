# Éclats Marchés

Marchés de prédiction personnels en Éclats : les questions, prix et résolutions proviennent de
Polymarket et Manifold (lecture seule), les positions sont virtuelles et réglées dans le
portefeuille central d'Éclats de l'écosystème. Aucune transaction réelle sur les plateformes
sources.

- Référence produit : `docs/HANDOFF_V1_5.md` (hand-off complet)
- Avancement : `docs/PLAN.md` · Décisions : `docs/DECISIONS.md`
- Connectivité Polymarket : `docs/POLYMARKET_CONNECTIVITY_REPORT.md` (Phase 0 : SUPPORTED)

## État actuel

**Phase A : prototype navigable sur fixtures.** Aucune connexion API persistante, aucune écriture
financière, solde de démonstration en mémoire. Gate A : validation visuelle par l'utilisateur
avant les phases B à E.

## Voir le prototype

**Lien d'aperçu permanent (privé) :**
<https://claude.ai/code/artifact/7fd0adfb-2e51-408e-bac2-a409737b84b8>

Cette adresse ne change jamais : à chaque modification du prototype, on régénère le paquet et on
republie au même endroit.

```powershell
node scripts/build_apercu.mjs
```

Le script fusionne `pwa/` en un seul fichier autonome `apercu.html` (CSS, modules JS et images
inlinés, aucune requête externe). Il échoue si deux modules déclarent le même identifiant de
premier niveau, puisque la fusion se fait dans une seule portée.

### En local

Servir `pwa/` en statique, par exemple :

```powershell
python -m http.server 8123 --directory pwa
```

puis ouvrir `http://localhost:8123`. Aucune dépendance, aucun build.

## Contradictions relevées dans le hand-off (section 28.4)

1. **Stack** : la section 23 recommande Next.js/TypeScript/Tailwind alors que les sections 4.2 et
   10.2.1 imposent la cohérence avec l'écosystème existant (PWA vanilla JS + Supabase, GitHub
   Pages). Tranché en faveur de l'écosystème : voir D-001, réversible.
2. **reserve/release** : l'interface `EclatsWalletProvider` suppose une réservation de fonds que
   le ledger central ne connaît pas ; le débit immédiat (modèle place_bet) est retenu, la
   réservation restant émulable (D-003).
3. **« Tester depuis l'environnement d'hébergement réellement prévu »** (12.0) : l'app étant une
   PWA statique, il y a trois environnements d'exécution (navigateur France, GitHub Actions,
   Supabase Edge Functions). Le spike Phase 0 couvre le navigateur ; les deux autres seront
   testés en Phase B avant activation (rapport à compléter).
4. **Vitesse de règlement** (16.4 : « moins de 2 minutes cible ») : dépend du planificateur
   gratuit ; GitHub Actions cron ne garantit pas la minute exacte. Documenté comme « meilleure
   fréquence gratuite disponible », conforme à la dégradation acceptable (20.3).

## Structure

```text
pwa/          prototype puis application (statique)
docs/         spécifications, décisions, rapports
scripts/      spikes et futurs scripts de synchronisation
sql/          migrations Supabase (Phase B+)
tests/        fixtures documentées puis tests
```
