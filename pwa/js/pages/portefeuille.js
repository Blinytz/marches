// Portefeuille (9.7) : vision patrimoniale globale + registre d'Éclats.
import { etat, totalARecuperer, marche } from "../etat.js";
import { echap, fmt, fmtSigne, etatVide, valeurPosition } from "../ui.js";

const ONGLETS_PORTEFEUILLE = [
  { cle: "vue", lib: "Vue générale" },
  { cle: "ordres", lib: "Ordres" },
  { cle: "historique", lib: "Historique" },
  { cle: "registre", lib: "Registre d'Éclats" }
];

export function pagePortefeuille({ query }) {
  if (etat.chargementCompte) {
    return `<h1>Portefeuille</h1><div class="enjeu-entete skeleton" style="height:110px"></div>`;
  }
  if (!etat.compteConnecte) {
    return `<h1>Portefeuille</h1>` + etatVide("🔐", "Portefeuille Éclats non connecté",
      "Connectez-vous avec le même compte que dans les autres applications de l’écosystème.",
      `<button class="btn btn-principal" data-action="ouvrir-connexion">Se connecter</button>`);
  }
  const onglet = query.o || "vue";
  const valPositions = etat.positions.reduce((s, p) => s + (valeurPosition(p) ?? p.montantExpose), 0);
  const aRecuperer = totalARecuperer();
  const total = (etat.solde || 0) + valPositions + aRecuperer;
  const expose = etat.positions.reduce((s, p) => s + p.montantExpose, 0);
  const plTotal = etat.claims.filter(c => c.type === "GAIN").reduce((s, c) => s + c.montant - c.mise, 0)
    + etat.defaites.reduce((s, d) => s + d.perte, 0) + (valPositions - expose);

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
        <p class="muet">Le suivi détaillé (courbes, lots, résultat) vit dans <a href="#/enjeu" style="text-decoration:underline">Positions</a>.</p>
      </div>`,
    ordres: etatVide("🧾", "Aucun ordre en attente",
      "Les ordres au marché s'exécutent immédiatement. Les ordres limités locaux arriveront dans une version future (modèle prévu, non activé)."),
    historique: `<div class="carte liste-compacte">
      ${etat.positions.flatMap((p) => p.chronologie.map((c) => ({ ...c, pos: p })))
        .sort((a, b) => new Date(b.t) - new Date(a.t))
        .map((c) => {
          const m = marche(c.pos.marcheId);
          return `<a class="ligne-compacte" href="#/marche/${c.pos.marcheId}">
          <span class="tres-muet" style="width:110px">${new Date(c.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <span style="flex:1"><strong>${echap(m?.titleOriginal || "Marché inconnu")}</strong><br>
            <span class="tres-muet">${echap(c.pos.issueLabel)} · ${echap(c.texte)}</span></span>
          <span class="pastille">${echap(m?.source || "Source inconnue")}</span>
        </a>`;
        }).join("")}</div>`,
    registre: `<div class="defilement-x"><table class="tableau">
      <thead><tr><th>Date</th><th>Libellé</th><th>Source</th><th>Montant</th></tr></thead>
      <tbody>
      ${etat.ledger.map((l) => {
        const m = l.marcheId ? marche(l.marcheId) : null;
        const contexte = m
          ? `<a href="#/marche/${m.id}">${echap(m.titleOriginal)}</a>`
          : echap(l.application || "Autre application");
        return `<tr>
        <td class="tres-muet">${new Date(l.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td>${echap(l.libelle)}<br><span class="tres-muet">${contexte}</span></td>
        <td><span class="pastille">${echap(l.source)}</span></td>
        <td class="num ${l.montant >= 0 ? "vert" : "rouge"}">${fmtSigne(l.montant)}</td>
      </tr>`;
      }).join("")}
      </tbody></table></div>
      <p class="tres-muet">Chaque ligne indique l'application ou le marché à l'origine du mouvement. Une mise retire des Éclats,
        une vente ou un gain récupéré en ajoute. Dans la version connectée, ces écritures seront créées uniquement côté serveur.</p>`
  };

  return `
    <h1>Portefeuille</h1>
    <div class="enjeu-entete">
      <div class="bloc"><span class="lib muet">Valeur totale</span><div class="val num" style="font-size:1.4rem; font-weight:700">${fmt(total)}</div></div>
      <div class="bloc"><span class="lib muet">Disponibles</span><div class="val num" style="font-size:1.15rem; font-weight:700">${fmt(etat.solde)}</div></div>
      <div class="bloc"><span class="lib muet">Positions</span><div class="val num" style="font-size:1.15rem; font-weight:700">${fmt(valPositions)}</div></div>
      <div class="bloc"><span class="lib muet">À récupérer</span><div class="val num orange" style="font-size:1.15rem; font-weight:700">${fmt(aRecuperer)}</div></div>
      <div class="bloc"><span class="lib muet">Résultat total</span><div class="val num ${plTotal >= 0 ? "vert" : "rouge"}">${fmtSigne(plTotal)}</div></div>
      <div class="bloc"><span class="lib muet">Registre</span><div class="val num">${etat.ledger.length}</div><span class="lib tres-muet">mouvements chargés</span></div>
    </div>

    <div class="chips" style="margin-top:14px">
      ${ONGLETS_PORTEFEUILLE.map((o) => `<a class="chip ${onglet === o.cle ? "actif" : ""}" href="#/portefeuille?o=${o.cle}">${o.lib}</a>`).join("")}
    </div>
    ${contenus[onglet] || contenus.vue}`;
}
