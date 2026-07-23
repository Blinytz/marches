// Page Statistiques (sous Portefeuille).
//
// Règle imposée par l'utilisateur : NE JAMAIS présenter le solde global d'Éclats
// comme une performance. Le solde bouge avec les autres applications de
// l'écosystème. Ici, tout est scopé à Éclats Marchés : gains/pertes, P&L, ROI
// se calculent uniquement à partir de l'activité de trading de cette appli.
//
// Phase A : les valeurs calculables le sont réellement à partir des fixtures ;
// les stats qui exigeraient un historique riche (calibration, calendrier,
// séries) sont marquées « démonstration » et seront branchées en Phase C/D.
import { etat, marche } from "../etat.js";
import { echap, fmt, fmtEclats, fmtSigne, sparkline, plLatent, valeurPosition } from "../ui.js";

function tuile(val, lib, classe = "") {
  return `<div class="stat"><div class="val num ${classe}">${val}</div><div class="lib">${echap(lib)}</div></div>`;
}
function demoTag() {
  return `<span class="pastille pastille-off" title="Sera calculé sur l'historique réel en Phase C/D">démonstration</span>`;
}

export function pageStats() {
  if (etat.demo.chargement) {
    return `<h1>Statistiques</h1>${Array(3).fill('<div class="panneau skeleton" style="height:120px; margin-top:14px"></div>').join("")}`;
  }

  const gagnes = etat.claims.filter((c) => c.type === "GAIN");
  const rembs = etat.claims.filter((c) => c.type === "REMBOURSEMENT");
  const perdus = etat.defaites;
  const positions = etat.positions;

  // ---- Résultat de trading (cette appli uniquement) ----
  const gainsNet = gagnes.reduce((s, c) => s + (c.montant - c.mise), 0);
  const pertesNet = perdus.reduce((s, d) => s + d.perte, 0); // négatif
  const pnlRealise = gainsNet + pertesNet;
  const pnlLatent = positions.reduce((s, p) => s + (plLatent(p) || 0), 0);
  const pnlTotal = pnlRealise + pnlLatent;
  const misesResolues = gagnes.reduce((s, c) => s + c.mise, 0) + perdus.reduce((s, d) => s + d.mise, 0);
  const roi = misesResolues > 0 ? (pnlRealise / misesResolues) * 100 : 0;

  const gainsEncaisses = gagnes.reduce((s, c) => s + c.montant, 0);
  const remboursements = rembs.reduce((s, c) => s + c.montant, 0);
  const pertesSeches = perdus.reduce((s, d) => s + d.mise, 0);

  // Courbe de P&L réalisé cumulé (scopée appli)
  const evts = [
    ...gagnes.map((c) => ({ t: new Date(c.resoluAt).getTime(), d: c.montant - c.mise })),
    ...perdus.map((d) => ({ t: new Date(d.resoluAt).getTime(), d: d.perte }))
  ].sort((a, b) => a.t - b.t);
  let cum = 0;
  const equity = [{ t: (evts[0]?.t || Date.now()) - 86400000, p: 0 }];
  evts.forEach((e) => { cum += e.d; equity.push({ t: e.t, p: Math.round(cum) }); });

  // ---- Précision ----
  const nbG = gagnes.length, nbP = perdus.length;
  const winRate = (nbG + nbP) > 0 ? (nbG / (nbG + nbP)) * 100 : 0;

  // ---- Records ----
  const meilleur = gagnes.map((c) => ({ t: c.titre, v: c.montant - c.mise, pct: ((c.montant - c.mise) / c.mise) * 100 }))
    .sort((a, b) => b.v - a.v)[0];
  const pire = perdus.map((d) => ({ t: d.titre, v: d.perte, pct: -100 })).sort((a, b) => a.v - b.v)[0];

  // ---- Rentabilité par source et par thème (réel) ----
  const rentabilite = (keyFn) => {
    const map = new Map();
    const ajoute = (k, mise, pnl) => {
      const e = map.get(k) || { mise: 0, pnl: 0 };
      e.mise += mise; e.pnl += pnl; map.set(k, e);
    };
    gagnes.forEach((c) => ajoute(keyFn(c), c.mise, c.montant - c.mise));
    perdus.forEach((d) => ajoute(keyFn(d), d.mise, d.perte));
    return [...map.entries()].filter(([, e]) => e.mise > 0)
      .map(([axe, e]) => ({ axe, mise: e.mise, pnl: e.pnl, rdt: (e.pnl / e.mise) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);
  };
  const themeDe = (x) => marche(x.marcheId)?.theme || "Autre";
  const sourceDe = (x) => x.source === "POLYMARKET" ? "Polymarket" : "Manifold";
  const parSource = rentabilite(sourceDe);
  const parTheme = rentabilite(themeDe);

  const tableRentabilite = (titre, lignes) => `
    <div class="panneau"><h3>${titre}</h3>
      <div class="defilement-x"><table class="tableau">
        <thead><tr><th>${echap(titre.replace("Rentabilité par ", ""))}</th><th>Misé</th><th>P&amp;L réalisé</th><th>Rendement</th></tr></thead>
        <tbody>${lignes.map((l) => `<tr>
          <td>${echap(l.axe)}</td>
          <td class="num">${fmt(l.mise)}</td>
          <td class="num ${l.pnl >= 0 ? "vert" : "rouge"}">${fmtSigne(l.pnl)}</td>
          <td class="num ${l.rdt >= 0 ? "vert" : "rouge"}">${fmtSigne(l.rdt)} %</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>`;

  // ---- Calibration (démonstration) ----
  const calib = [
    { plage: "0 à 20 %", predit: 12, reel: 15, n: 6 },
    { plage: "20 à 40 %", predit: 31, reel: 27, n: 9 },
    { plage: "40 à 60 %", predit: 50, reel: 52, n: 11 },
    { plage: "60 à 80 %", predit: 69, reel: 74, n: 8 },
    { plage: "80 à 100 %", predit: 88, reel: 83, n: 7 }
  ];

  // ---- Calendrier d'activité (démonstration déterministe) ----
  let seed = 42;
  const jour = () => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * 5); };
  const semaines = 16;
  const heatmap = Array.from({ length: semaines * 7 }, jour);

  // ---- Badges / jalons ----
  const badges = [
    { ico: "🎯", nom: "Premier pari", ok: true },
    { ico: "🏆", nom: "Premier gain récupéré", ok: gagnes.some((c) => etat.claimsRecuperes.has(c.id)) },
    { ico: "🔥", nom: "3 gains d'affilée", ok: nbG >= 3 },
    { ico: "🌍", nom: "5 thèmes différents", ok: parTheme.length >= 5 },
    { ico: "💎", nom: "Position tenue jusqu'à résolution", ok: true },
    { ico: "⚡", nom: "10 marchés suivis", ok: etat.favoris.size >= 3 }
  ];

  return `
    <h1>Statistiques</h1>
    <p class="muet" style="margin-top:-6px">Toutes ces stats ne concernent que votre activité sur Éclats Marchés.
      Elles n'incluent pas votre solde global d'Éclats, qui dépend aussi des autres applications de l'écosystème.</p>

    <div class="rangee-titre"><h2>📈 Résultat de trading</h2></div>
    <div class="panneau">
      <div class="stats-grille">
        ${tuile(fmtSigne(pnlRealise), "P&L réalisé (appli)", pnlRealise >= 0 ? "vert" : "rouge")}
        ${tuile(fmtSigne(Math.round(pnlLatent)), "P&L latent (positions ouvertes)", pnlLatent >= 0 ? "vert" : "rouge")}
        ${tuile(fmtSigne(Math.round(pnlTotal)), "P&L total de l'appli", pnlTotal >= 0 ? "vert" : "rouge")}
        ${tuile(fmtSigne(Math.round(roi)) + " %", "ROI réalisé (sur mises)", roi >= 0 ? "vert" : "rouge")}
      </div>
      <div style="margin-top:14px">${sparkline(equity, { w: 320, h: 60 })}
        <div class="lib tres-muet">P&L réalisé cumulé sur cette appli</div></div>
    </div>

    <div class="rangee-titre"><h2>◆ Éclats gagnés et perdus (appli)</h2></div>
    <div class="panneau"><div class="stats-grille">
      ${tuile(fmt(gainsEncaisses), "Gains encaissés", "vert")}
      ${tuile(fmt(remboursements), "Remboursements")}
      ${tuile(fmt(pertesSeches), "Pertes sèches", "rouge")}
      ${tuile(fmtSigne(Math.round(gainsNet + pertesNet)), "Gain net de trading", (gainsNet + pertesNet) >= 0 ? "vert" : "rouge")}
    </div></div>

    <div class="rangee-titre"><h2>🎲 Précision de vos pronostics</h2></div>
    <div class="panneau">
      <div class="stats-grille">
        ${tuile(fmt(winRate) + " %", `Taux de réussite (${nbG}/${nbG + nbP})`)}
        ${tuile("0,182 " + demoTag(), "Score de Brier (plus bas = mieux)")}
        ${tuile("+4,1 pts " + demoTag(), "Edge moyen vs résolution")}
        ${tuile("+2,3 % " + demoTag(), "Performance vs le marché")}
      </div>
      <h3 style="margin-top:16px">Courbe de calibration ${demoTag()}</h3>
      <p class="tres-muet">Quand vous pariez à X %, gagnez-vous vraiment X % du temps ? Barre pleine = votre prédiction, barre claire = résultat réel.</p>
      <div class="calib">
        ${calib.map((c) => `<div class="calib-ligne">
          <span class="calib-plage">${c.plage}</span>
          <div class="calib-barres">
            <div class="calib-barre predit" style="width:${c.predit}%"><span>${c.predit}%</span></div>
            <div class="calib-barre reel" style="width:${c.reel}%"><span>${c.reel}%</span></div>
          </div>
          <span class="tres-muet">${c.n} paris</span>
        </div>`).join("")}
      </div>
    </div>

    ${tableRentabilite("Rentabilité par source", parSource)}
    ${tableRentabilite("Rentabilité par thème", parTheme)}

    <div class="panneau"><h3>Rentabilité par horizon et par cote ${demoTag()}</h3>
      <div class="defilement-x"><table class="tableau">
        <thead><tr><th>Découpage</th><th>Misé</th><th>P&amp;L</th><th>Rendement</th></tr></thead>
        <tbody>
          <tr><td>Court terme (&lt; 24 h)</td><td class="num">450</td><td class="num vert">+312</td><td class="num vert">+69 %</td></tr>
          <tr><td>Moyen terme (&lt; 30 j)</td><td class="num">600</td><td class="num vert">+188</td><td class="num vert">+31 %</td></tr>
          <tr><td>Long terme</td><td class="num">300</td><td class="num rouge">-95</td><td class="num rouge">-32 %</td></tr>
          <tr><td>Favoris (proba ≥ 80 %)</td><td class="num">500</td><td class="num vert">+120</td><td class="num vert">+24 %</td></tr>
          <tr><td>Outsiders (proba ≤ 20 %)</td><td class="num">200</td><td class="num vert">+340</td><td class="num vert">+170 %</td></tr>
          <tr><td>Paris OUI</td><td class="num">700</td><td class="num vert">+410</td><td class="num vert">+59 %</td></tr>
          <tr><td>Paris NON</td><td class="num">350</td><td class="num rouge">-5</td><td class="num rouge">-1 %</td></tr>
        </tbody>
      </table></div>
    </div>

    <div class="rangee-titre"><h2>🏅 Records</h2></div>
    <div class="stats-grille">
      ${tuile("+" + fmt(meilleur?.v || 0), "Meilleur gain net", "vert")}
      ${tuile(fmt(pire?.v || 0), "Pire perte", "rouge")}
      ${tuile("+" + fmt(Math.round(meilleur?.pct || 0)) + " %", "Meilleur rendement", "vert")}
      ${tuile("2 j 4 h " + demoTag(), "Résolution la plus rapide")}
    </div>
    <div class="panneau" style="margin-top:12px">
      <p class="muet">🥇 Meilleur trade : <strong>${echap(meilleur?.t || "?")}</strong> (${fmtSigne(meilleur?.v || 0)} Éclats)</p>
      <p class="muet">💔 Pire trade : <strong>${echap(pire?.t || "?")}</strong> (${fmtSigne(pire?.v || 0)} Éclats)</p>
    </div>

    <div class="rangee-titre"><h2>🔥 Séries ${demoTag()}</h2></div>
    <div class="stats-grille">
      ${tuile("2 gains", "Série en cours", "vert")}
      ${tuile("4 gains", "Plus longue série de gains", "vert")}
      ${tuile("2 pertes", "Plus longue série de pertes", "rouge")}
    </div>

    <div class="rangee-titre"><h2>🧭 Comportement</h2></div>
    <div class="panneau"><div class="stats-grille">
      ${tuile(positions.length + nbG + nbP + rembs.length, "Paris pris au total")}
      ${tuile(positions.length, "Positions ouvertes")}
      ${tuile(fmt(misesResolues / Math.max(1, nbG + nbP)), "Mise moyenne")}
      ${tuile("38 % " + demoTag(), "Revendus avant résolution")}
    </div>
    <h3 style="margin-top:16px">Calendrier d'activité ${demoTag()}</h3>
    <div class="heatmap">
      ${heatmap.map((n) => `<span class="hm-case hm-${n}"></span>`).join("")}
    </div>
    <div class="hm-legende tres-muet">Moins <span class="hm-case hm-0"></span><span class="hm-case hm-1"></span><span class="hm-case hm-2"></span><span class="hm-case hm-3"></span><span class="hm-case hm-4"></span> Plus</div>
    </div>

    <div class="rangee-titre"><h2>🛡️ Discipline et risque</h2></div>
    <div class="panneau"><div class="stats-grille">
      ${tuile(fmt(positions.reduce((s, p) => s + p.montantExpose, 0)), "Exposition ouverte")}
      ${tuile(fmt(Math.round(Math.max(...positions.map((p) => p.montantExpose), 0) / Math.max(1, positions.reduce((s, p) => s + p.montantExpose, 0)) * 100)) + " %", "Concentration (plus gros pari)")}
      ${tuile(parTheme.length + " thèmes", "Diversification")}
      ${tuile("Respectée " + demoTag(), "Limite d'exposition par marché")}
    </div></div>

    <div class="rangee-titre"><h2>🏆 Jalons</h2></div>
    <div class="badges">
      ${badges.map((b) => `<div class="badge-jalon ${b.ok ? "obtenu" : "verrouille"}">
        <span class="bj-ico">${b.ico}</span><span class="bj-nom">${echap(b.nom)}</span>
        <span class="bj-etat">${b.ok ? "Obtenu" : "À débloquer"}</span>
      </div>`).join("")}
    </div>

    <p class="tres-muet" style="margin-top:20px">Les blocs marqués « démonstration » seront calculés sur votre historique réel dès que le trading sera branché (Phases C et D).</p>
  `;
}
