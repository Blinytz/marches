// Aides de rendu partagées (formats, badges, cartes, graphiques SVG).
// Tous les rendus retournent des chaînes HTML ; les interactions passent par la
// délégation d'événements de app.js (data-action, data-fav, data-aller).

import { etat, marche } from "./etat.js";

export const echap = (s) => String(s ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const nf2 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const fmt = (n) => nf2.format(n);
export const fmtEclats = (n) => `${nf2.format(n)} Éclats`;
export const fmtSigne = (n) => `${n >= 0 ? "+" : ""}${nf2.format(n)}`;

export function fmtCompact(n) {
  if (n == null) return "?";
  if (n >= 1e6) return `${nf2.format(Math.round(n / 1e5) / 10)} M`;
  if (n >= 1e3) return `${nf0.format(Math.round(n / 1e3))} K`;
  return nf0.format(n);
}

export const pct = (p) => p == null ? "?" : `${Math.round(p * 100)}%`;
export const prix = (p) => p == null ? "?" : nf2.format(p * etat.valeurNominale);

export function fraicheur(m) {
  if (m.status !== "OPEN") return "";
  const s = m.fraicheurS ?? 0;
  if (etat.demo.ws_deconnecte) return `<span class="pastille pastille-warn">Données retardées</span>`;
  if (m.donneesRetardees || s > 120) {
    const lib = s > 3600 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 60)} min`;
    return `<span class="pastille pastille-warn">Retardé · ${lib}</span>`;
  }
  if (s <= 15) return `<span class="pastille pastille-ok">En direct</span>`;
  return `<span class="pastille pastille-off">Actualisé il y a ${s} s</span>`;
}

export function tempsRestant(iso, prefixe = "") {
  if (!iso) return "échéance inconnue";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "échéance passée";
  const h = ms / 3600e3;
  let lib;
  if (h < 1) lib = `${Math.max(1, Math.round(ms / 60e3))} min`;
  else if (h < 48) lib = `${Math.round(h)} h`;
  else if (h < 24 * 60) lib = `${Math.round(h / 24)} j`;
  else lib = `${Math.round(h / 24 / 30)} mois`;
  return `${prefixe}${lib}`;
}

export function compteReboursCourt(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function libelleEcheance(m) {
  if (m.status === "RESOLVED" || m.status === "CANCELLED") return "terminé";
  if (m.status === "CLOSED") return "Fermé · résolution en attente";
  if (m.expectedResolutionAt && m.resolutionTimeConfidence !== "UNKNOWN") {
    const conf = m.resolutionTimeConfidence === "EXACT" ? "" : "≈ ";
    return `résolution ${conf}${tempsRestant(m.expectedResolutionAt, "dans ")}`;
  }
  if (m.closeAt) return `clôture ${tempsRestant(m.closeAt, "dans ")}`;
  return "échéance inconnue";
}

export const badgeSource = (source) =>
  `<span class="badge-source ${source.toLowerCase()}">${source === "POLYMARKET" ? "Polymarket" : "Manifold"}</span>`;

export function pastilleStatut(m) {
  if (etat.demo["panne_" + m.source.toLowerCase()]) return `<span class="pastille pastille-no">Source indisponible</span>`;
  switch (m.status) {
    case "OPEN": return m.tradable
      ? `<span class="pastille pastille-ok">Ouvert</span>`
      : `<span class="pastille pastille-warn">Consultable · trading non pris en charge</span>`;
    case "CLOSED": return `<span class="pastille pastille-warn">Fermé · résolution en attente</span>`;
    case "RESOLVED": return `<span class="pastille">Résolu</span>`;
    case "CANCELLED": return `<span class="pastille pastille-no">Annulé</span>`;
    default: return `<span class="pastille pastille-no">Indisponible</span>`;
  }
}

export function etoile(m) {
  const actif = etat.favoris.has(m.id);
  return `<button class="carte-etoile ${actif ? "actif" : ""}" data-fav="${m.id}"
    title="${actif ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-pressed="${actif}">${actif ? "★" : "☆"}</button>`;
}

export function imgMarche(m, classe = "carte-img") {
  if (!m.imageUrl) return `<span class="${classe}" aria-hidden="true">◈</span>`;
  return `<img class="${classe}" src="${echap(m.imageUrl)}" alt=""
    onerror="this.outerHTML='<span class=&quot;${classe}&quot;>◈</span>'">`;
}

export function issuePrincipale(m) {
  return m.issues.find((i) => i.id === "oui") || m.issues[0];
}

export function htmlVariation(issue) {
  if (issue?.prob == null || issue.prev24h == null) return `<span class="variation flat">?</span>`;
  const d = (issue.prob - issue.prev24h) * 100;
  const cls = d > 0.2 ? "up" : d < -0.2 ? "down" : "flat";
  const fleche = d > 0.2 ? "▲" : d < -0.2 ? "▼" : "·";
  return `<span class="variation ${cls}">${fleche} ${nf2.format(Math.abs(d))} pts (24 h)</span>`;
}

// ------- Graphiques SVG maison (Phase A) -------

export function sparkline(history, { w = 150, h = 34, depuis = null, ligne = null } = {}) {
  if (!history || history.length < 2) return `<span class="tres-muet">pas de données</span>`;
  let pts = depuis ? history.filter((p) => p.t >= depuis) : history;
  if (pts.length < 2) pts = history.slice(-2);
  const min = Math.min(...pts.map((p) => p.p)), max = Math.max(...pts.map((p) => p.p));
  const amp = Math.max(0.02, max - min);
  const x = (i) => (i / (pts.length - 1)) * w;
  const y = (p) => h - 3 - ((p - min) / amp) * (h - 6);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.p).toFixed(1)}`).join(" ");
  const monte = pts.at(-1).p >= pts[0].p;
  const coul = monte ? "var(--yes)" : "var(--no)";
  const refLigne = ligne != null && ligne >= min && ligne <= max
    ? `<line x1="0" x2="${w}" y1="${y(ligne).toFixed(1)}" y2="${y(ligne).toFixed(1)}" stroke="var(--text-3)" stroke-dasharray="3 3" stroke-width="1"/>` : "";
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    ${refLigne}<path d="${d}" fill="none" stroke="${coul}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

export function grapheDetaille(history, { h = 220, marqueurs = [], ligneEntree = null, plageH = null } = {}) {
  if (!history || history.length < 2) {
    return `<div class="etat-vide"><span class="ico">📈</span>Pas encore assez de données de prix pour tracer une courbe.</div>`;
  }
  const w = 720;
  let pts = plageH ? history.filter((p) => p.t >= Date.now() - plageH * 3600e3) : history;
  if (pts.length < 2) pts = history.slice(-Math.min(12, history.length));
  const min = Math.max(0, Math.min(...pts.map((p) => p.p)) - 0.04);
  const max = Math.min(1, Math.max(...pts.map((p) => p.p)) + 0.04);
  const amp = Math.max(0.05, max - min);
  const x = (t) => ((t - pts[0].t) / Math.max(1, pts.at(-1).t - pts[0].t)) * (w - 46) + 40;
  const y = (p) => h - 22 - ((p - min) / amp) * (h - 40);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.p).toFixed(1)}`).join(" ");
  const grille = [0.25, 0.5, 0.75].filter((g) => g > min && g < max).map((g) =>
    `<line x1="40" x2="${w - 6}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
     <text x="4" y="${(y(g) + 4).toFixed(1)}" fill="var(--text-3)" font-size="11">${Math.round(g * 100)}%</text>`).join("");
  const entree = ligneEntree != null && ligneEntree > min && ligneEntree < max
    ? `<line x1="40" x2="${w - 6}" y1="${y(ligneEntree).toFixed(1)}" y2="${y(ligneEntree).toFixed(1)}"
        stroke="var(--accent)" stroke-dasharray="5 4" stroke-width="1.4"/>
       <text x="${w - 8}" y="${(y(ligneEntree) - 5).toFixed(1)}" fill="var(--accent)" font-size="11" text-anchor="end">prix moyen d'entrée</text>` : "";
  const marks = marqueurs.filter((mk) => mk.t >= pts[0].t && mk.t <= pts.at(-1).t).map((mk) => {
    const proche = pts.reduce((a, b) => Math.abs(b.t - mk.t) < Math.abs(a.t - mk.t) ? b : a);
    const coul = mk.type === "vente" ? "var(--no)" : mk.type === "achat" ? "var(--yes)" : "var(--info)";
    return `<circle cx="${x(mk.t).toFixed(1)}" cy="${y(proche.p).toFixed(1)}" r="4.5" fill="${coul}" stroke="var(--bg)" stroke-width="1.5">
      <title>${echap(mk.titre)}</title></circle>`;
  }).join("");
  const dernier = pts.at(-1);
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Courbe de probabilité">
    ${grille}
    <path d="${d} L${x(dernier.t).toFixed(1)},${h - 20} L40,${h - 20} Z" fill="var(--accent-fond)" stroke="none"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    ${entree}${marks}
    <circle cx="${x(dernier.t).toFixed(1)}" cy="${y(dernier.p).toFixed(1)}" r="3.5" fill="var(--accent)"/>
  </svg>`;
}

// ------- Cartes marché -------

export function boutonsOuiNon(m, taille = "") {
  if (!m.tradable || m.status !== "OPEN" || m.marketType !== "BINARY") return "";
  const oui = m.issues.find((i) => i.id === "oui"), non = m.issues.find((i) => i.id === "non");
  return `<div class="boutons-oui-non ${taille}">
    <button class="btn-oui" data-action="ticket" data-marche="${m.id}" data-issue="oui">OUI ${oui.prob != null ? Math.round(oui.prob * 100) : "?"}</button>
    <button class="btn-non" data-action="ticket" data-marche="${m.id}" data-issue="non">NON ${non.prob != null ? Math.round(non.prob * 100) : "?"}</button>
  </div>`;
}

export function carteMarche(m) {
  const ip = issuePrincipale(m);
  const doublon = etat.marches.some((x) => x.id !== m.id && x.theme === m.theme &&
    x.titleOriginal.toLowerCase().includes("fed") && m.titleOriginal.toLowerCase().includes("fed") && x.source !== m.source);
  return `<div class="carte carte-marche">
    <div class="carte-haut">
      ${imgMarche(m)}
      <a class="carte-titre" href="#/marche/${m.id}">${echap(m.titleOriginal)}</a>
      ${etoile(m)}
    </div>
    <div class="carte-meta">
      ${badgeSource(m.source)}
      <span>${echap(m.theme)}</span>
      ${pastilleStatut(m)}
    </div>
    <div class="carte-proba">
      <span class="proba-principale">${pct(ip.prob)}</span>
      ${htmlVariation(ip)}
    </div>
    ${boutonsOuiNon(m)}
    <div class="carte-pied">
      <span>vol ${fmtCompact(m.volume)}</span>
      <span>·</span>
      <span>${libelleEcheance(m)}</span>
      ${doublon ? `<span class="avertissement-doublon" title="Question similaire sur l'autre source, jamais fusionnée">≈ doublon inter-sources</span>` : ""}
    </div>
  </div>`;
}

export function ligneCompacte(m) {
  const ip = issuePrincipale(m);
  return `<a class="ligne-compacte" href="#/marche/${m.id}">
    ${imgMarche(m)}
    <span class="carte-titre">${echap(m.titleOriginal)}</span>
    ${badgeSource(m.source)}
    <span class="proba-principale">${pct(ip.prob)}</span>
    ${htmlVariation(ip)}
  </a>`;
}

export function carteMultiIssues(m, limite = 4) {
  const issues = m.issues.slice(0, limite);
  const reste = m.issues.length - limite;
  return `<div class="carte">
    <div class="carte-haut">
      ${imgMarche(m)}
      <a class="carte-titre" href="#/marche/${m.id}">${echap(m.titleOriginal)}</a>
      ${etoile(m)}
    </div>
    <div class="carte-meta">${badgeSource(m.source)}<span>${echap(m.theme)}</span>${pastilleStatut(m)}
      <span>vol ${fmtCompact(m.volume)}</span></div>
    <div class="liste-issues">
      ${issues.map((i) => `<div class="ligne-issue">
          <span class="lib" title="${echap(i.label)}">${echap(i.label)}</span>
          <span class="proba">${pct(i.prob)}</span>
          ${m.tradable ? `<button class="btn-oui" data-action="ticket" data-marche="${m.id}" data-issue="${i.id}">Acheter</button>` : ""}
        </div>`).join("")}
      ${reste > 0 ? `<a class="tres-muet" href="#/marche/${m.id}">+ ${reste} autres issues…</a>` : ""}
    </div>
  </div>`;
}

export function skeletons(n = 6, type = "carte") {
  const bloc = type === "carte"
    ? `<div class="carte skeleton" style="height:170px"></div>`
    : `<div class="ligne-compacte skeleton" style="height:52px"></div>`;
  return Array(n).fill(bloc).join("");
}

export function etatVide(ico, titre, texte = "", action = "") {
  return `<div class="etat-vide"><span class="ico">${ico}</span>
    <strong>${echap(titre)}</strong>
    ${texte ? `<p class="muet">${texte}</p>` : ""}${action}</div>`;
}

// ------- Calculs de position (affichage seulement, la vraie compta sera côté serveur) -------

export function probIssue(m, issueId) {
  const i = m.issues.find((x) => x.id === issueId);
  return i ? i.prob : null;
}

export function prixLiquidation(pos) {
  const m = marche(pos.marcheId);
  if (!m) return null;
  let p = probIssue(m, pos.issueId);
  if (p == null) return null;
  if (m.source === "MANIFOLD" && m.status === "OPEN") p = Math.max(0.01, p - 0.01); // spread miroir côté vente
  return p * pos.valeurNominale;
}

export function valeurPosition(pos) {
  const pu = prixLiquidation(pos);
  return pu == null ? null : pu * pos.parts;
}

export function plLatent(pos) {
  const v = valeurPosition(pos);
  if (v == null) return null;
  return v - pos.montantExpose;
}

export function paiementPotentiel(pos) {
  // Les lots des fixtures représentent les parts restantes après ventes partielles
  return pos.lots.reduce((s, l) => s + l.parts * l.valeurNominale, 0);
}

export function historiqueIssue(pos) {
  const m = marche(pos.marcheId);
  if (!m) return [];
  const i = m.issues.find((x) => x.id === pos.issueId);
  return i?.history || [];
}
