import { etat } from "../etat.js";
import { fmt, fmtSigne, etatVide } from "../ui.js";

export function pageStats() {
  if (!etat.compteConnecte) {
    return `<h1>Statistiques</h1>` + etatVide("🔐", "Connectez votre portefeuille Éclats",
      "Les statistiques sont calculées uniquement à partir de vos transactions réelles.");
  }
  const marches = etat.ledger.filter((ligne) => String(ligne.source || "").startsWith("marches_"));
  if (!marches.length) {
    return `<h1>Statistiques</h1>` + etatVide("📊", "Pas encore de transaction Marchés",
      "Cette page se remplira à partir de votre historique réel, sans donnée artificielle.");
  }
  const depense = -marches.filter((l) => l.montant < 0).reduce((s, l) => s + l.montant, 0);
  const gagne = marches.filter((l) => l.montant > 0).reduce((s, l) => s + l.montant, 0);
  const net = gagne - depense;
  return `<h1>Statistiques</h1>
    <div class="enjeu-entete">
      <div class="bloc"><span class="lib muet">Transactions réelles</span><div class="val num">${marches.length}</div></div>
      <div class="bloc"><span class="lib muet">Éclats engagés</span><div class="val num">${fmt(depense)}</div></div>
      <div class="bloc"><span class="lib muet">Éclats reçus</span><div class="val num">${fmt(gagne)}</div></div>
      <div class="bloc"><span class="lib muet">Flux net Marchés</span><div class="val num ${net >= 0 ? "vert" : "rouge"}">${fmtSigne(net)}</div></div>
    </div>
    <p class="tres-muet">Calculé exclusivement depuis le registre commun des Éclats.</p>`;
}
