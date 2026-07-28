// Recherche et exploration : filtres obligatoires (8.3), horizons (8.4), tris (8.5),
// doublons inter-sources jamais fusionnés (3.2).
import { etat } from "../etat.js";
import { carteMarche, skeletons, etatVide, echap } from "../ui.js";
import { THEMES } from "../data/fixtures.js";

const HORIZONS = [
  { cle: "1", lib: "< 1 h" }, { cle: "6", lib: "< 6 h" }, { cle: "24", lib: "< 24 h" },
  { cle: "72", lib: "< 3 j" }, { cle: "168", lib: "< 7 j" }, { cle: "720", lib: "< 30 j" },
  { cle: "plus", lib: "Plus tard" }
];
const TRIS = [
  { cle: "pertinent", lib: "Pertinent pour moi" },
  { cle: "echeance", lib: "Résolution la plus proche" },
  { cle: "nouveau", lib: "Nouveau" },
  { cle: "volume", lib: "Plus gros volume" },
  { cle: "variation", lib: "Variation 24 h" },
  { cle: "50", lib: "Proche de 50 %" },
  { cle: "activite", lib: "Activité récente" }
];

function score(m) {
  let s = 0;
  if (etat.prefs.themesSuivis.includes(m.theme)) s += 40;
  if (m.regions.some((r) => etat.prefs.regionsSuivies.includes(r))) s += 30;
  if (m.closeAt && new Date(m.closeAt) - Date.now() < etat.prefs.horizonPrefereH * 3600e3) s += 30;
  if (m.tradable) s += 15;
  s += Math.min(15, (m.volume24h || 0) / 100000);
  if (etat.prefs.masques.includes(m.theme)) s -= 1000;
  if (m.closeAt && new Date(m.closeAt) - Date.now() > 90 * 24 * 3600e3) s -= 10;
  return s;
}

export function filtrerMarches(q) {
  let liste = etat.marches.filter((m) => m.status === "OPEN" || q.statut === "tous");
  if (etat.demo.panne_polymarket) liste = liste.filter((m) => m.source !== "POLYMARKET");
  if (etat.demo.panne_manifold) liste = liste.filter((m) => m.source !== "MANIFOLD");
  if (q.q) {
    const t = q.q.toLowerCase();
    liste = liste.filter((m) => m.titleOriginal.toLowerCase().includes(t) ||
      m.theme.toLowerCase().includes(t) ||
      (m.descriptionOriginal || "").toLowerCase().includes(t));
  }
  if (q.source) liste = liste.filter((m) => m.source === q.source);
  if (q.theme) liste = liste.filter((m) => m.theme === q.theme);
  if (q.region && q.region !== "France & Europe") liste = liste.filter((m) => m.regions.includes(q.region));
  if (q.region === "France & Europe") liste = liste.filter((m) => m.regions.some((r) => ["France", "Europe"].includes(r)));
  if (q.horizon && q.horizon !== "plus") {
    liste = liste.filter((m) => m.closeAt && new Date(m.closeAt) - Date.now() < Number(q.horizon) * 3600e3);
  }
  if (q.horizon === "plus") liste = liste.filter((m) => m.closeAt && new Date(m.closeAt) - Date.now() >= 720 * 3600e3);
  if (q.tradable === "1") liste = liste.filter((m) => m.tradable);
  if (q.favoris === "1") liste = liste.filter((m) => etat.favoris.has(m.id));
  if (q.position === "1") liste = liste.filter((m) => etat.positions.some((p) => p.marcheId === m.id));

  const tri = q.tri || "pertinent";
  const cmp = {
    pertinent: (a, b) => score(b) - score(a),
    echeance: (a, b) => new Date(a.closeAt || 8e15) - new Date(b.closeAt || 8e15),
    nouveau: (a, b) => (b.volume24h || 0) / Math.max(1, b.volume || 1) - (a.volume24h || 0) / Math.max(1, a.volume || 1),
    volume: (a, b) => (b.volume || 0) - (a.volume || 0),
    variation: (a, b) => {
      const va = (x) => { const i = x.issues[0]; return i?.prob != null && i.prev24h != null ? Math.abs(i.prob - i.prev24h) : 0; };
      return va(b) - va(a);
    },
    "50": (a, b) => {
      const d = (x) => { const i = x.issues[0]; return i?.prob == null ? 1 : Math.abs(i.prob - 0.5); };
      return d(a) - d(b);
    },
    activite: (a, b) => (b.volume24h || 0) - (a.volume24h || 0)
  }[tri] || ((a, b) => score(b) - score(a));
  return liste.sort(cmp);
}

function lien(q, patch) {
  const p = new URLSearchParams({ ...q, ...patch });
  [...p.entries()].forEach(([k, v]) => { if (!v) p.delete(k); });
  return `#/recherche?${p.toString()}`;
}

export function pageRecherche({ query: q }) {
  if (etat.demo.chargement || etat.chargementCatalogue) {
    return `<h1>Recherche</h1><div class="grille-cartes">${skeletons(9)}</div>`;
  }

  if (q.vue === "themes") {
    return `<h1>Thèmes</h1>
      <div class="chips">${THEMES.map((t) =>
        `<a class="chip ${etat.prefs.themesSuivis.includes(t) ? "actif" : ""}" href="${lien({}, { theme: t })}">
          ${etat.prefs.themesSuivis.includes(t) ? "★ " : ""}${echap(t)}</a>`).join("")}</div>
      <p class="muet">Les thèmes suivis (★) alimentent votre fil Pour moi. Gérez-les dans Ma liste.</p>`;
  }

  const resultats = filtrerMarches(q);
  const chipsActifs = [];
  if (q.q) chipsActifs.push(`<a class="chip actif" href="${lien(q, { q: "" })}">« ${echap(q.q)} » ✕</a>`);
  if (q.source) chipsActifs.push(`<a class="chip actif" href="${lien(q, { source: "" })}">${q.source === "POLYMARKET" ? "Polymarket" : "Manifold"} ✕</a>`);
  if (q.theme) chipsActifs.push(`<a class="chip actif" href="${lien(q, { theme: "" })}">${echap(q.theme)} ✕</a>`);
  if (q.region) chipsActifs.push(`<a class="chip actif" href="${lien(q, { region: "" })}">${echap(q.region)} ✕</a>`);
  if (q.horizon) chipsActifs.push(`<a class="chip actif" href="${lien(q, { horizon: "" })}">${HORIZONS.find((h) => h.cle === q.horizon)?.lib || q.horizon} ✕</a>`);
  if (q.tradable === "1") chipsActifs.push(`<a class="chip actif" href="${lien(q, { tradable: "" })}">Tradable ✕</a>`);
  if (q.favoris === "1") chipsActifs.push(`<a class="chip actif" href="${lien(q, { favoris: "" })}">Favoris ✕</a>`);
  if (q.position === "1") chipsActifs.push(`<a class="chip actif" href="${lien(q, { position: "" })}">Avec position ✕</a>`);

  return `
    <h1>Recherche</h1>
    <input class="champ" id="champ-recherche-page" type="search" value="${echap(q.q || "")}"
      placeholder="Rechercher parmi tous les marchés des deux sources…" aria-label="Recherche">

    <div class="chips">
      ${chipsActifs.join("")}
      <a class="chip ${!q.source ? "actif" : ""}" href="${lien(q, { source: "" })}">Toutes sources</a>
      <a class="chip ${q.source === "POLYMARKET" ? "actif" : ""}" href="${lien(q, { source: "POLYMARKET" })}">Polymarket</a>
      <a class="chip ${q.source === "MANIFOLD" ? "actif" : ""}" href="${lien(q, { source: "MANIFOLD" })}">Manifold</a>
      <span style="border-left:1px solid var(--border); margin:0 2px"></span>
      ${HORIZONS.map((h) => `<a class="chip ${q.horizon === h.cle ? "actif" : ""}" href="${lien(q, { horizon: h.cle })}">${h.lib}</a>`).join("")}
      <span style="border-left:1px solid var(--border); margin:0 2px"></span>
      <a class="chip ${q.tradable === "1" ? "actif" : ""}" href="${lien(q, { tradable: q.tradable === "1" ? "" : "1" })}">Tradable uniquement</a>
      <a class="chip ${q.favoris === "1" ? "actif" : ""}" href="${lien(q, { favoris: q.favoris === "1" ? "" : "1" })}">Mes favoris</a>
      <a class="chip ${q.position === "1" ? "actif" : ""}" href="${lien(q, { position: q.position === "1" ? "" : "1" })}">Avec position</a>
    </div>

    <div class="chips">
      <span class="tres-muet" style="align-self:center">Trier :</span>
      ${TRIS.map((t) => `<a class="chip ${(q.tri || "pertinent") === t.cle ? "actif" : ""}" href="${lien(q, { tri: t.cle })}">${t.lib}</a>`).join("")}
    </div>

    <div class="rangee-titre">
      <span class="muet">${resultats.length} résultat${resultats.length > 1 ? "s" : ""} ·
        les questions similaires des deux sources restent distinctes</span>
      <button class="btn btn-discret lien-tout" data-action="enregistrer-filtre">Enregistrer ce filtre</button>
    </div>

    ${resultats.length
      ? `<div class="grille-cartes">${resultats.map(carteMarche).join("")}</div>`
      : etatVide("🔍", "Aucun résultat",
          "Essayez d'élargir l'horizon, de retirer un filtre ou de chercher en anglais (les titres viennent des sources).",
          `<a class="btn" href="#/recherche">Réinitialiser les filtres</a>`)}`;
}
