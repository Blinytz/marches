// Portefeuille (9.7) : vision patrimoniale globale + registre d'Éclats.
import { etat, totalARecuperer } from "../etat.js";
import { echap, fmt, fmtEclats, fmtSigne, etatVide, valeurPosition, sparkline } from "../ui.js";

const ONGLETS_PORTEFEUILLE = [
  { cle: "vue", lib: "Vue générale" },
  { cle: "ordres", lib: "Ordres" },
  { cle: "historique", lib: "Historique" },
  { cle: "registre", lib: "Registre d'Éclats" }
];

export function pagePortefeuille({ query }) {
  if (etat.demo.chargement) {
    return `<h1>Portefeuille</h1><div class="enjeu-entete skeleton" style="height:110px"></div>`;
  }
  const onglet = query.o || "vue";
  const valPositions = etat.positions.reduce((s, p) => s + (valeurPosition(p) ?? p.montantExpose), 0);
  const aRecuperer = totalARecuperer();
  const total = etat.solde + valPositions + aRecuperer;
  const expose = etat.positions.reduce((s, p) => s + p.montantExpose, 0);
  const plJour = 102; // démonstration
  const plTotal = etat.claims.filter(c => c.type === "GAIN").reduce((s, c) => s + c.montant - c.mise, 0)
    + etat.defaites.reduce((s, d) => s + d.perte, 0) + (valPositions - expose);

  const courbe = Array.from({ length: 30 }, (_, i) => ({ t: Date.now() - (29 - i) * 24 * 3600e3, p: 0.8 + i * 0.006 + (i % 5) * 0.004 }));

  const contenus = {
    vue: `
      <div class="panneau"><h3>Ventilation</h3>
        <div class="stats-grille">
          <div class="stat"><div class="val num">${fmt(etat.solde)}</div><div class="lib">Éclats disponibles</div></div>
          <div class="stat"><div class="val num">${fmt(valPositions)}</div><div class="lib">Valeur des positions</div></div>
          <div class="stat"><div class="val num orange">${fmt(aRecuperer)}</div><div class="lib">À récupérer (pas encore dépensable)</div></div>
        </div>
        <p class="tres-muet">Le solde de l'en-tête ne compte que les Éclats déjà crédités dans le portefeuille central de l'écosystème.
          Les gains à récupérer n'y entrent qu'après le clic « Récupérer » dans Résultats.</p>
      </div>
      <div class="panneau"><h3>Positions ouvertes</h3>
        <p class="muet">Le suivi détaillé (courbes, lots, P&amp;L) vit dans <a href="#/enjeu" style="text-decoration:underline">En jeu</a>.</p>
      </div>`,
    ordres: etatVide("🧾", "Aucun ordre en attente",
      "Les ordres au marché s'exécutent immédiatement. Les ordres limités locaux arriveront dans une version future (modèle prévu, non activé)."),
    historique: `<div class="carte liste-compacte">
      ${etat.positions.flatMap((p) => p.chronologie.map((c) => ({ ...c, pos: p })))
        .sort((a, b) => new Date(b.t) - new Date(a.t))
        .map((c) => `<div class="ligne-compacte">
          <span class="tres-muet" style="width:110px">${new Date(c.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <span class="carte-titre" style="flex:1">${echap(c.texte)}</span>
        </div>`).join("")}</div>`,
    registre: `<div class="defilement-x"><table class="tableau">
      <thead><tr><th>Date</th><th>Libellé</th><th>Source</th><th>Montant</th></tr></thead>
      <tbody>
      ${etat.ledger.map((l) => `<tr>
        <td class="tres-muet">${new Date(l.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td>${echap(l.libelle)}</td>
        <td class="tres-muet">${echap(l.source)}</td>
        <td class="num ${l.montant >= 0 ? "vert" : "rouge"}">${fmtSigne(l.montant)}</td>
      </tr>`).join("")}
      </tbody></table></div>
      <p class="tres-muet">Registre partagé de l'écosystème : chaque app y écrit ses mouvements via sa propre source.
        Écriture toujours côté serveur, jamais depuis le navigateur.</p>`
  };

  return `
    <h1>Portefeuille</h1>
    <div class="enjeu-entete">
      <div class="bloc"><span class="lib muet">Valeur totale</span><div class="val num" style="font-size:1.4rem; font-weight:700">${fmt(total)}</div></div>
      <div class="bloc"><span class="lib muet">Disponibles</span><div class="val num" style="font-size:1.15rem; font-weight:700">${fmt(etat.solde)}</div></div>
      <div class="bloc"><span class="lib muet">Positions</span><div class="val num" style="font-size:1.15rem; font-weight:700">${fmt(valPositions)}</div></div>
      <div class="bloc"><span class="lib muet">À récupérer</span><div class="val num orange" style="font-size:1.15rem; font-weight:700">${fmt(aRecuperer)}</div></div>
      <div class="bloc"><span class="lib muet">P&amp;L aujourd'hui</span><div class="val num vert">${fmtSigne(plJour)}</div></div>
      <div class="bloc"><span class="lib muet">P&amp;L total</span><div class="val num ${plTotal >= 0 ? "vert" : "rouge"}">${fmtSigne(plTotal)}</div></div>
      <div class="bloc" style="min-width:180px">${sparkline(courbe, { w: 180, h: 44 })}<span class="lib tres-muet">Valeur sur 30 jours</span></div>
    </div>

    <div class="chips" style="margin-top:14px">
      ${ONGLETS_PORTEFEUILLE.map((o) => `<a class="chip ${onglet === o.cle ? "actif" : ""}" href="#/portefeuille?o=${o.cle}">${o.lib}</a>`).join("")}
      <a class="chip" href="#/resultats">Résultats ↗</a>
    </div>
    ${contenus[onglet] || contenus.vue}`;
}
