import { etat } from "../etat.js";
import { etatVide } from "../ui.js";

export function pageResultats() {
  if (etat.chargementCompte) return `<h1>Résultats</h1><div class="carte skeleton" style="height:120px"></div>`;
  if (!etat.compteConnecte) {
    return `<h1>Résultats</h1>` + etatVide("🔐", "Connectez votre portefeuille Éclats",
      "Les résultats sont personnels et proviennent exclusivement de vos positions réelles.",
      `<button class="btn btn-principal" data-action="ouvrir-connexion">Se connecter</button>`);
  }
  return `<h1>Résultats</h1>` + etatVide("⏳", "Aucun résultat réel disponible",
    "Les gains et remboursements apparaîtront ici après la résolution de vos positions réelles.");
}
