# Consignes de collaboration

Lire `ecosystem.json`, `README.md` et `docs/CODEX_HANDOFF_20260723.md` avant toute
modification.

- Application personnelle, dépôt privé.
- Le ledger et le solde actuels sont simulés : ne pas les présenter comme
  connectés à l'écosystème.
- Aucun ancien solde ne doit être migré ou fusionné.
- Ne pas exécuter de migration ni déployer sans autorisation explicite.
- Une IA par branche ; préserver les changements existants.
- Toute correction reproductible doit ajouter ou mettre à jour un test.
- Lancer `node tests/all.mjs` puis `node scripts/build_apercu.mjs`.
- Mettre à jour `ecosystem.json` si stockage, commandes ou intégration changent.
