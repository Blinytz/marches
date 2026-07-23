// Page En jeu (9.6) : destination principale de suivi des positions.
import { etat, marche, claimsOuverts, etatClaim } from "../etat.js";
import {
  echap, badgeSource, imgMarche, pct, fmt, fmtEclats, fmtSigne, sparkline,
  compteReboursCourt, libelleEcheance, fraicheur, etatVide, valeurPosition,
  plLatent, paiementPotentiel, probIssue, historiqueIssue, grapheDetaille
} from "../ui.js";

const SEGMENTS = [
  { cle: "actifs", lib: "Actifs" },
  { cle: "bientot", lib: "Bientôt" },
  { cle: "fermes", lib: "Fermés, résultat attendu" },
  { cle: "recuperer", lib: "À récupérer" },
  { cle: "long", lib: "Long terme" },
  { cle: "tous", lib: "Tous" }
];

function segmentDe(pos) {
  const m = marche(pos.marcheId);
  if (!m) return "tous";
  if (m.status === "CLOSED") return "fermes";
  const restant = m.expectedResolutionAt ? new Date(m.expectedResolutionAt) - Date.now() : Infinity;
  if (restant < 24 * 3600e3) return "bientot";
  if (restant > 30 * 24 * 3600e3) return "long";
  return "actifs";
}

function cartePosition(pos, deplie) {
  const m = marche(pos.marcheId);
  if (!m) return "";
  const p = probIssue(m, pos.issueId);
  const val = valeurPosition(pos);
  const pl = plLatent(pos);
  const plPctv = pl != null ? (pl / pos.montantExpose) * 100 : null;
  const deltaPts = p != null ? (p - pos.probEntree) * 100 : null;
  const favorable = deltaPts != null && deltaPts >= 0;
  const paiement = paiementPotentiel(pos);
  const histo = historiqueIssue(pos);
  const echeanceProche = m.expectedResolutionAt && new Date(m.expectedResolutionAt) - Date.now() < 24 * 3600e3 && m.status === "OPEN";
  const retarde = m.donneesRetardees || etat.demo.ws_deconnecte;

  const message = m.status === "CLOSED"
    ? "Marché fermé : en attente de la décision de l'oracle source."
    : p == null ? "Prix momentanément indisponible : dernier état conservé."
    : favorable
      ? `Le marché vous est actuellement favorable : ${fmtSigne(deltaPts)} points depuis votre achat.`
      : `Le marché vous est actuellement défavorable : ${fmtSigne(deltaPts)} points depuis votre achat.`;

  return `<div class="carte carte-position" data-pos="${pos.id}">
    <div class="pos-entetes">
      ${imgMarche(m)}
      <a class="carte-titre" style="flex:1" href="#/marche/${m.id}">${echap(m.titleOriginal)}</a>
      ${badgeSource(m.source)}
      <span class="pos-issue ${pos.issueId === "non" ? "non" : "oui"}">${echap(pos.issueLabel)}</span>
      ${retarde ? `<span class="pastille pastille-warn">Données retardées</span>` : fraicheur(m)}
    </div>
    <div class="pos-chiffres">
      <div class="bloc"><span class="lib">Engagé</span><span class="val num">${fmt(pos.montantExpose)}</span></div>
      <div class="bloc"><span class="lib">Entrée → actuel</span>
        <span class="val num">${fmt(pos.probEntree * 100)} → ${p != null ? fmt(p * 100) : "?"}
        ${deltaPts != null ? `<span class="${favorable ? "vert" : "rouge"}">(${fmtSigne(deltaPts)} pts)</span>` : ""}</span></div>
      <div class="bloc"><span class="lib">Valeur actuelle</span><span class="val num">${val != null ? fmt(val) : "?"}</span></div>
      <div class="bloc"><span class="lib">Résultat latent</span>
        <span class="val num ${pl >= 0 ? "vert" : "rouge"}">${pl != null ? `${fmtSigne(pl)} (${fmtSigne(plPctv)} %)` : "?"}</span></div>
      <div class="bloc"><span class="lib">Paiement potentiel</span><span class="val num">${fmt(paiement)}</span></div>
      ${sparkline(histo, { depuis: new Date(pos.achatAt).getTime(), ligne: pos.probEntree })}
    </div>
    <p class="pos-message">${message}</p>
    <div class="pos-pied">
      <span class="tres-muet">${m.status === "CLOSED" ? "Fermé · résolution en attente" : libelleEcheance(m)}</span>
      ${echeanceProche ? `<span class="compte-rebours" data-rebours="${m.expectedResolutionAt}">${compteReboursCourt(m.expectedResolutionAt)}</span>` : ""}
      <span style="flex:1"></span>
      <a class="btn btn-discret" href="#/marche/${m.id}">Voir</a>
      ${m.status === "OPEN" && m.tradable ? `
        <a class="btn btn-discret" href="#/marche/${m.id}?issue=${pos.issueId}&mode=achat&t=1">Renforcer</a>
        <a class="btn" href="#/marche/${m.id}?issue=${pos.issueId}&mode=vente&t=1">Vendre</a>` : ""}
      <button class="btn btn-discret" data-action="deplier-pos" data-pos="${pos.id}">${deplie ? "Replier" : "Détail"}</button>
    </div>
    ${deplie ? `<div class="pos-detail">
      <div class="graphique-conteneur">${grapheDetaille(histo, {
        ligneEntree: pos.probEntree,
        marqueurs: [
          ...pos.lots.map((l) => ({ t: new Date(l.date).getTime(), type: "achat", titre: `Achat : ${fmt(l.parts)} parts à ${fmt(l.prixUnitaire)}` })),
          ...(pos.ventes || []).map((v) => ({ t: new Date(v.t).getTime(), type: "vente", titre: `Vente : ${fmt(v.parts)} parts à ${fmt(v.prixUnitaire)}` }))
        ]
      })}</div>
      <p class="tres-muet">La courbe suit la probabilité de l'issue détenue (${echap(pos.issueLabel)}), depuis le premier achat. Points verts : achats · points rouges : ventes · ligne pointillée : prix moyen d'entrée.</p>
      <h3>Lots (FIFO)</h3>
      <div class="defilement-x"><table class="tableau"><thead><tr><th>Date</th><th>Parts restantes</th><th>Prix unitaire</th><th>Valeur nominale</th></tr></thead>
      <tbody>${pos.lots.map((l) => `<tr><td>${new Date(l.date).toLocaleDateString("fr-FR")}</td>
        <td class="num">${fmt(l.parts)}</td><td class="num">${fmt(l.prixUnitaire)}</td><td class="num">${fmt(l.valeurNominale)} Éclats</td></tr>`).join("")}</tbody></table></div>
      <h3>Chronologie</h3>
      <ul class="chronologie">${pos.chronologie.map((c) => `<li><span class="tres-muet">${new Date(c.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span> · ${echap(c.texte)}</li>`).join("")}</ul>
    </div>` : ""}
  </div>`;
}

export function pageEnjeu({ query }) {
  if (etat.demo.chargement) {
    return `<h1>Mes positions</h1><div class="enjeu-entete skeleton" style="height:90px"></div>
      ${Array(3).fill('<div class="carte skeleton" style="height:150px; margin-top:12px"></div>').join("")}`;
  }
  const positions = etat.positions;
  if (!positions.length) {
    return `<h1>Mes positions</h1>` + etatVide("🎯", "Aucune position ouverte",
      "Achetez OUI ou NON sur un marché : votre position vivra ici, avec sa courbe, son résultat et son échéance.",
      `<a class="btn btn-principal" href="#/recherche?horizon=24&tradable=1">Voir les marchés courts</a>`);
  }

  const segment = query.seg || "tous";
  const deplie = query.detail || null;
  const claims = claimsOuverts();

  const enrichies = positions.map((pos) => ({ pos, seg: segmentDe(pos), pl: plLatent(pos) }));
  const visibles = segment === "tous" ? enrichies
    : segment === "recuperer" ? []
    : enrichies.filter((x) => x.seg === segment);

  const totalExpose = positions.reduce((s, p) => s + p.montantExpose, 0);
  const totalValeur = enrichies.reduce((s, x) => s + (valeurPosition(x.pos) ?? x.pos.montantExpose), 0);
  const totalPl = totalValeur - totalExpose;
  const paiementMax = positions.reduce((s, p) => s + paiementPotentiel(p), 0);
  const favorables = enrichies.filter((x) => (x.pl ?? 0) >= 0).length;
  const prochaine = positions
    .map((p) => marche(p.marcheId)?.expectedResolutionAt).filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  const tri = query.tri || "echeance";
  visibles.sort((a, b) => {
    if (tri === "pl") return (b.pl ?? -1e9) - (a.pl ?? -1e9);
    if (tri === "pire") return (a.pl ?? 1e9) - (b.pl ?? 1e9);
    if (tri === "enjeu") return b.pos.montantExpose - a.pos.montantExpose;
    const ea = marche(a.pos.marcheId)?.expectedResolutionAt || "9999";
    const eb = marche(b.pos.marcheId)?.expectedResolutionAt || "9999";
    return new Date(ea) - new Date(eb);
  });

  const lienSeg = (s) => `#/enjeu?seg=${s}${tri !== "echeance" ? "&tri=" + tri : ""}`;
  const compteSeg = (s) => s === "recuperer" ? claims.length : s === "tous" ? enrichies.length : enrichies.filter((x) => x.seg === s).length;

  return `
    <h1>Mes positions</h1>
    <div class="enjeu-entete">
      <div class="bloc"><span class="lib muet">Positions ouvertes</span><div class="val num" style="font-size:1.25rem; font-weight:700">${positions.length}</div></div>
      <div class="bloc"><span class="lib muet">Encore exposé</span><div class="val num" style="font-size:1.25rem; font-weight:700">${fmt(totalExpose)}</div></div>
      <div class="bloc"><span class="lib muet">Valeur liquidative</span><div class="val num" style="font-size:1.25rem; font-weight:700">${fmt(totalValeur)}</div></div>
      <div class="bloc"><span class="lib muet">Résultat latent</span><div class="val num ${totalPl >= 0 ? "vert" : "rouge"}" style="font-size:1.25rem; font-weight:700">${fmtSigne(totalPl)} (${fmtSigne((totalPl / totalExpose) * 100)} %)</div></div>
      <div class="bloc"><span class="lib muet">Paiement maximal</span><div class="val num" style="font-size:1.25rem; font-weight:700">${fmt(paiementMax)}</div></div>
      <div class="bloc"><span class="lib muet">Prochaine échéance</span><div class="val compte-rebours" data-rebours="${prochaine || ""}">${prochaine ? compteReboursCourt(prochaine) : "?"}</div></div>
      <div class="bloc"><span class="lib muet">Favorables / défavorables</span><div class="val num"><span class="vert">${favorables}</span> / <span class="rouge">${positions.length - favorables}</span></div></div>
    </div>

    <div class="segments">
      ${SEGMENTS.map((s) => `<a class="chip ${segment === s.cle ? "actif" : ""}" href="${lienSeg(s.cle)}">${s.lib}${compteSeg(s.cle) ? ` · ${compteSeg(s.cle)}` : ""}</a>`).join("")}
    </div>
    <div class="chips">
      <span class="tres-muet" style="align-self:center">Trier :</span>
      ${[["echeance", "Échéance"], ["pl", "Meilleur résultat"], ["pire", "Pire résultat"], ["enjeu", "Plus gros enjeu"]].map(([c, l]) =>
        `<a class="chip ${tri === c ? "actif" : ""}" href="#/enjeu?seg=${segment}&tri=${c}">${l}</a>`).join("")}
    </div>

    ${segment === "recuperer"
      ? (claims.length
          ? claims.map((c) => `<div class="carte carte-claim" style="margin-bottom:12px">
              <div class="pos-entetes">${badgeSource(c.source)}<strong style="flex:1">${echap(c.titre)}</strong>
                <span class="claim-montant num">${fmt(c.montant)}</span></div>
              <p class="pos-message">${c.type === "REMBOURSEMENT" ? "Marché annulé par la source : remboursement de votre coût restant." : "Issue gagnante : " + echap(c.issueLabel)}</p>
              <a class="btn btn-claim" href="#/resultats">Récupérer dans Résultats</a>
            </div>`).join("")
          : etatVide("🏆", "Rien à récupérer pour le moment"))
      : visibles.length
        ? visibles.map((x) => cartePosition(x.pos, deplie === x.pos.id)).join("")
        : etatVide("🗂️", "Aucune position dans ce segment")}
  `;
}
